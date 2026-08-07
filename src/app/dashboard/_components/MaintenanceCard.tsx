'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import { defaultMaintenanceTasks, maintenanceName, maintenanceProgress, maintenanceProgressColor, maintenanceStatusText, type MaintenanceTask } from '../../../lib/maintenance'

type Props = { userId?: string; odometerKm: number; demoTasks?: MaintenanceTask[]; onDemoCta?: () => void }

export function MaintenanceCard({ userId, odometerKm, demoTasks, onDemoCta }: Props) {
  const { lang } = useLanguage()
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const isDemo = Boolean(demoTasks)
  const text = lang === 'zh' ? { title: '自行车保养建议', progress: '当前进度', remaining: '剩余', complete: '标记为已完成', all: '查看全部', cost: '可选：本次费用 (£)', notes: '可选：备注', days: '天' } : { title: 'Bike maintenance', progress: 'Current progress', remaining: 'remaining', complete: 'Mark as completed', all: 'View all', cost: 'Optional: cost (£)', notes: 'Optional: notes', days: 'days' }

  const load = async () => {
    if (demoTasks) { setTasks(demoTasks); return }
    if (!userId) return
    const { supabase } = await import('../../../lib/supabase')
    await supabase.from('bike_maintenance_tasks').upsert(defaultMaintenanceTasks.map(([task_type, display_name, distance_interval_km, time_interval_days]) => ({ user_id: userId, task_type, display_name, distance_interval_km, time_interval_days, last_completed_odometer_km: odometerKm })), { onConflict: 'user_id,task_type', ignoreDuplicates: true })
    const { data } = await supabase.from('bike_maintenance_tasks').select('*').eq('user_id', userId).eq('active', true)
    setTasks((data ?? []) as MaintenanceTask[])
  }
  useEffect(() => { void load() }, [demoTasks, userId])
  const urgent = [...tasks].sort((a, b) => maintenanceProgress(b, odometerKm).ratio - maintenanceProgress(a, odometerKm).ratio)[0]
  if (!urgent) return null
  const progress = maintenanceProgress(urgent, odometerKm)
  const complete = async () => {
    if (isDemo) { onDemoCta?.(); return }
    if (!userId) return
    const { supabase } = await import('../../../lib/supabase')
    const cost = window.prompt(text.cost)
    const notes = window.prompt(text.notes)
    setBusy(true)
    await supabase.from('bike_maintenance_history').insert({ task_id: urgent.id, user_id: userId, odometer_km: odometerKm, cost: cost ? Number(cost) : null, notes: notes || null })
    await supabase.from('bike_maintenance_tasks').update({ last_completed_at: new Date().toISOString(), last_completed_odometer_km: odometerKm }).eq('id', urgent.id)
    await load(); setBusy(false)
  }
  const color = progress.status === '逾期' ? 'text-rose-600' : progress.status === '到期' ? 'text-orange-600' : progress.status === '即将到期' ? 'text-amber-600' : 'text-emerald-600'
  return <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2"><button onClick={() => setCollapsed(value => !value)} className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base font-bold text-slate-600">{collapsed ? '+' : '−'}</button><div><p className="text-xs font-medium text-slate-400">{text.title}</p>{!collapsed && <h2 className="mt-1 font-semibold text-slate-800">{maintenanceName(urgent, lang)}</h2>}</div></div>{!collapsed && <span className={`pt-1 text-sm font-bold ${color}`}>{maintenanceStatusText(progress.status, lang)}</span>}</div>{!collapsed && <><p className="mt-3 text-sm text-slate-500">{text.progress} {Math.round(progress.ratio * 100)}% · {progress.kmRemaining !== null && `${progress.kmRemaining.toFixed(0)} km ${text.remaining}`}{progress.kmRemaining !== null && progress.daysRemaining !== null && ' · '}{progress.daysRemaining !== null && `${progress.daysRemaining} ${text.days} ${text.remaining}`}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.min(100, progress.ratio * 100)}%`, background: `linear-gradient(90deg, #22c55e, ${maintenanceProgressColor(progress.ratio)})` }} /></div><div className="mt-4 flex justify-between"><button disabled={busy} onClick={complete} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{isDemo ? 'Create an account to update' : text.complete}</button>{isDemo ? <Link href="/login" className="py-2 text-xs font-semibold text-sky-600">Create account →</Link> : <Link href="/maintenance" className="py-2 text-xs font-semibold text-sky-600">{text.all} →</Link>}</div></>}</section>
}
