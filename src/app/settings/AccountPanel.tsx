'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LogOut, LogIn, UserRound } from 'lucide-react'
import { dataClient } from '../../lib/data-client'

export function AccountPanel({ lang }: { lang: 'en' | 'zh' }) {
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const text = lang === 'zh' ? { title: '账户', guest: '演示模式 / 未登录', signIn: '登录账户', logout: '退出登录' } : { title: 'Account', guest: 'Demo mode / not signed in', signIn: 'Sign in', logout: 'Log out' }

  useEffect(() => {
    const loadAccount = async () => {
      const { data: { session } } = await dataClient.auth.getSession()
      const user = session?.user
      if (!user) return
      setAccount({ name: user.email?.split('@')[0] ?? 'CycleWorth rider', email: user.email ?? '' })
    }
    void loadAccount().catch(() => {})
  }, [])

  const logout = async () => {
    setLoggingOut(true)
    await dataClient.auth.signOut()
    window.location.assign('/login')
  }

  if (!account) return <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5"><h3 className="mb-2 flex items-center gap-1.5 text-base font-bold text-slate-800"><UserRound className="h-4 w-4 text-sky-600" />{text.title}</h3><p className="text-xs text-slate-500">{text.guest}</p><Link href="/login" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white"><LogIn className="h-3.5 w-3.5" />{text.signIn}</Link></section>
  return <section className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3.5"><h3 className="mb-3 flex items-center gap-1.5 text-base font-bold text-slate-800"><UserRound className="h-4 w-4 text-sky-600" />{text.title}</h3><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-extrabold text-white">{account.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{account.name}</p><p className="truncate text-xs text-slate-500">{account.email}</p></div></div><button onClick={() => void logout()} disabled={loggingOut} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-xs font-bold text-rose-700 disabled:opacity-50"><LogOut className="h-3.5 w-3.5" />{text.logout}</button></div></section>
}
