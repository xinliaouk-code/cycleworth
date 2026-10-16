'use client'
import { createContext, Suspense, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Bike, House, Route, ChartNoAxesCombined, RefreshCw, Settings } from 'lucide-react'
import { dataClient } from '../lib/data-client'
import { DEFAULT_NAVIGATION, navigationHref, navigationIds, navigationLabels, parseNavigation, type NavigationId } from '../lib/navigation'
import { useLanguage } from './LanguageProvider'

const NavigationContext = createContext({ tabs: DEFAULT_NAVIGATION, save: async (_tabs: NavigationId[]): Promise<boolean> => false, ready: false, account: false })
export function AppNavigationProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<NavigationId[]>(DEFAULT_NAVIGATION)
  const [owner, setOwner] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let active = true
    let revision = 0
    const { data: { subscription } } = dataClient.auth.onAuthStateChange(async () => {
      const current = ++revision
      setReady(false)
      try {
        const session = (await dataClient.auth.getSession()).data.session
        const id = session?.user.id ?? null
        if (!active || current !== revision) return
        setOwner(id)
        if (id) {
          const { data, error } = await dataClient.from('settings').select('navigation_tabs').eq('id', id).maybeSingle()
          if (error) throw new Error(error.message)
          if (active && current === revision) setTabs(parseNavigation(data?.navigation_tabs))
        } else {
          let saved: unknown = null
          try { saved = JSON.parse(localStorage.getItem('cw_demo_navigation') ?? 'null') } catch {}
          if (active && current === revision) setTabs(parseNavigation(saved))
        }
        if (active && current === revision) setReady(true)
      } catch { if (active && current === revision) setReady(false) }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  const save = useCallback(async (next: NavigationId[]) => {
    if (!ready) return false
    const normalized = parseNavigation(next)
    if (owner) {
      const { error } = await dataClient.from('settings').upsert({ id: owner, navigation_tabs: normalized })
      if (error) return false
    } else {
      try { localStorage.setItem('cw_demo_navigation', JSON.stringify(normalized)) } catch { return false }
    }
    setTabs(normalized)
    return true
  }, [owner, ready])
  return <NavigationContext.Provider value={{ tabs, save, ready, account: !!owner }}>{children}<Suspense fallback={null}><BottomNavigation /></Suspense></NavigationContext.Provider>
}
const icons = { overview: House, rides: Route, bike: Bike, trends: ChartNoAxesCombined, sync: RefreshCw, settings: Settings }
function BottomNavigation() {
  const pathname = usePathname()
  const search = useSearchParams()
  const { tabs } = useContext(NavigationContext)
  const { lang } = useLanguage()
  const appPage = pathname.startsWith('/dashboard') || pathname.startsWith('/settings') || pathname.startsWith('/maintenance')
  if (!appPage) return null
  const active = pathname.startsWith('/settings/health') ? 'sync' : pathname.startsWith('/settings') ? 'settings' : pathname.startsWith('/maintenance') ? 'bike' : search.get('view') ?? 'overview'
  return <nav className="bottom-navigation" aria-label={lang === 'zh' ? '主要导航' : 'Main navigation'}>{tabs.map(id => {
    const Icon = icons[id]
    return <Link key={id} href={navigationHref(id, search.get('demo') === 'true')} aria-current={active === id ? 'page' : undefined} className="bottom-navigation-item"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /><span>{navigationLabels[id][lang]}</span></Link>
  })}</nav>
}
export function NavigationSettings() {
  const { tabs, save, ready, account } = useContext(NavigationContext)
  const { lang } = useLanguage()
  const zh = lang === 'zh'
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function replace(index: number, id: NavigationId) {
    const next = [...tabs], other = next.indexOf(id)
    if (other >= 0) next[other] = next[index]
    next[index] = id
    setBusy(true)
    const ok = await save(next)
    setMessage(ok ? (zh ? (account ? '底部导航已保存到账号。' : '已保存在当前设备，登录后可保存到账号。') : (account ? 'Navigation saved to your account.' : 'Saved on this device. Sign in to save to your account.')) : (zh ? '保存失败，请稍后重试。' : 'Could not save. Please retry.'))
    setBusy(false)
  }
  return <section id="navigation" className="rounded-3xl border border-slate-200 bg-white/90 p-5 space-y-4">
    <div><h2 className="font-bold text-slate-900">{zh ? '底部导航' : 'Bottom navigation'}</h2><p className="mt-1 text-sm text-slate-500">{zh ? '从左到右固定四项。选中已有的项目会交换位置。' : 'Pin four destinations from left to right. Choosing an existing item swaps positions.'}</p></div>
    <div className="grid grid-cols-2 gap-3">{tabs.map((id, index) => <label key={index} className="space-y-1 text-xs font-medium text-slate-500"><span>{zh ? '位置' : 'Position'} {index + 1}</span><select aria-label={`${zh ? '位置' : 'Position'} ${index + 1}`} value={id} disabled={!ready || busy} onChange={event => void replace(index, event.target.value as NavigationId)} className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-800">{navigationIds.map(option => <option value={option} key={option}>{navigationLabels[option][lang]}</option>)}</select></label>)}</div>
    {!ready && <p className="text-xs text-slate-500">{zh ? '正在读取导航设置；若持续不可用，请检查网络后刷新。' : 'Loading preferences. If unavailable, check your connection and reload.'}</p>}
    <p role="status" className="text-xs text-emerald-800">{message}</p>
    <div className="border-t border-slate-100 pt-3"><p className="mb-2 text-xs text-slate-500">{zh ? '全部功能（未固定的功能也可以从这里打开）' : 'All destinations, including unpinned items'}</p><div className="flex flex-wrap gap-2">{navigationIds.map(id => <Link key={id} href={navigationHref(id)} className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">{navigationLabels[id][lang]}</Link>)}</div></div>
  </section>
}
