'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { parseTfLFareSettings } from '../../../lib/tfl/fares'
import { DEFAULT_DASHBOARD_LAYOUT, dashboardSections, parseDashboardLayout, type DashboardLayout, type DashboardSection } from '../../../lib/dashboard-layout'

const names: Record<DashboardSection, string> = { advice: '今日骑行建议', stats: '核心统计', maintenance: '自行车保养建议', weekly: '月度周骑行', roi: '自行车回报率', settings: '通勤规则', sync: 'Strava 数据同步', chart: '周度趋势', rides: '近期骑行明细' }

export default function LayoutSettingsPage() {
  const router = useRouter(); const [userId, setUserId] = useState(''); const [fareSettings, setFareSettings] = useState<Record<string, unknown>>({}); const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT)
  useEffect(() => { supabase.auth.getSession().then(async ({ data: { session } }) => { if (!session?.user) { router.push('/login'); return }; setUserId(session.user.id); const { data } = await supabase.from('settings').select('tfl_fare_settings').eq('id', session.user.id).maybeSingle(); const parsed = parseTfLFareSettings(data?.tfl_fare_settings); setFareSettings(parsed); setLayout(parseDashboardLayout(parsed.dashboardLayout)) }) }, [router])
  const move = (index: number, direction: -1 | 1) => setLayout(current => { const order = [...current.order]; const target = index + direction; if (target < 0 || target >= order.length) return current; [order[index], order[target]] = [order[target], order[index]]; return { ...current, order } })
  const toggle = (section: DashboardSection) => setLayout(current => ({ ...current, hidden: current.hidden.includes(section) ? current.hidden.filter(item => item !== section) : [...current.hidden, section] }))
  const save = () => supabase.from('settings').upsert({ id: userId, tfl_fare_settings: { ...fareSettings, dashboardLayout: layout } }, { onConflict: 'id' })
  return <main className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-xl space-y-4"><Link href="/dashboard" className="text-sm font-medium text-sky-600">← 返回主页</Link><section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h1 className="text-xl font-bold text-slate-800">主页布局</h1><p className="mt-1 text-sm text-slate-500">使用上移、下移和隐藏来自定义主页。</p><div className="mt-4 space-y-2">{layout.order.map((section, index) => <div key={section} className="flex items-center gap-2 rounded-xl border border-slate-100 p-3"><span className="flex-1 text-sm font-medium text-slate-700">{names[section]}</span><button onClick={() => move(index, -1)} disabled={index === 0} className="rounded-lg bg-slate-100 px-2 py-1 text-xs disabled:opacity-30">↑</button><button onClick={() => move(index, 1)} disabled={index === layout.order.length - 1} className="rounded-lg bg-slate-100 px-2 py-1 text-xs disabled:opacity-30">↓</button><button onClick={() => toggle(section)} className={`rounded-lg px-2 py-1 text-xs ${layout.hidden.includes(section) ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{layout.hidden.includes(section) ? '已隐藏' : '显示'}</button></div>)}</div><div className="mt-5 flex gap-3"><button onClick={() => setLayout(DEFAULT_DASHBOARD_LAYOUT)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">恢复默认</button><button onClick={save} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white">保存布局</button></div></section></div></main>
}
