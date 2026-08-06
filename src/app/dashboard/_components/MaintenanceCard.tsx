'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import { supabase } from '../../../lib/supabase'
import { defaultMaintenanceTasks, maintenanceName, maintenanceProgress, maintenanceProgressColor, maintenanceStatusText, type MaintenanceTask } from '../../../lib/maintenance'

export function MaintenanceCard({ userId, odometerKm }: { userId: string; odometerKm: number }) {
  const { lang } = useLanguage()
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const text = lang === 'zh' ? {
    title: '\u81ea\u884c\u8f66\u4fdd\u517b\u5efa\u8bae', progress: '\u5f53\u524d\u8fdb\u5ea6', remaining: '\u5269\u4f59', complete: '\u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210', all: '\u67e5\u770b\u5168\u90e8', cost: '\u53ef\u9009\uff1a\u672c\u6b21\u8d39\u7528 (£)', notes: '\u53ef\u9009\uff1a\u5907\u6ce8', days: '\u5929', expand: '\u5c55\u5f00\u4fdd\u517b\u5efa\u8bae', collapse: '\u6536\u8d77\u4fdd\u517b\u5efa\u8bae',
  } : {
    title: 'Bike maintenance', progress: 'Current progress', remaining: 'remaining', complete: 'Mark as completed', all: 'View all', cost: 'Optional: cost (£)', notes: 'Optional: notes', days: 'days', expand: 'Expand maintenance recommendation', collapse: 'Collapse maintenance recommendation',
  }
  const load = async () => {
    await supabase.from('bike_maintenance_tasks').upsert(defaultMaintenanceTasks.map(([task_type, display_name, distance_interval_km, time_interval_days]) => ({ user_id: userId, task_type, display_name, distance_interval_km, time_interval_days, last_completed_odometer_km: odometerKm })), { onConflict: 'user_id,task_type', ignoreDuplicates: true })
    const { data } = await supabase.from('bike_maintenance_tasks').select('*').eq('user_id', userId).eq('active', true)
    setTasks((data ?? []) as MaintenanceTask[])
  }
  useEffect(() => { load() }, [userId])
  const urgent = [...tasks].sort((a, b) => maintenanceProgress(b, odometerKm).ratio - maintenanceProgress(a, odometerKm).ratio)[0]
  if (!urgent) return null
  const progress = maintenanceProgress(urgent, odometerKm)
  const complete = async () => {
    const cost = window.prompt(text.cost)
    const notes = window.prompt(text.notes)
    setBusy(true)
    await supabase.from('bike_maintenance_history').insert({ task_id: urgent.id, user_id: userId, odometer_km: odometerKm, cost: cost ? Number(cost) : null, notes: notes || null })
    await supabase.from('bike_maintenance_tasks').update({ last_completed_at: new Date().toISOString(), last_completed_odometer_km: odometerKm }).eq('id', urgent.id)
    await load(); setBusy(false)
  }
  const color = progress.status === '\u903e\u671f' ? 'text-rose-600' : progress.status === '\u5230\u671f' ? 'text-orange-600' : progress.status === '\u5373\u5c06\u5230\u671f' ? 'text-amber-600' : 'text-emerald-600'
  return <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2"><button onClick={() => setCollapsed(value => !value)} title={collapsed ? text.expand : text.collapse} aria-label={collapsed ? text.expand : text.collapse} className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base font-bold text-slate-600">{collapsed ? '+' : '−'}</button><div><p className="text-xs font-medium text-slate-400">{text.title}</p>{!collapsed && <h2 className="mt-1 font-semibold text-slate-800">{maintenanceName(urgent, lang)}</h2>}</div></div>{!collapsed && <span className={`pt-1 text-sm font-bold ${color}`}>{maintenanceStatusText(progress.status, lang)}</span>}</div>{!collapsed && <><p className="mt-3 text-sm text-slate-500">{text.progress} {Math.round(progress.ratio * 100)}% · {progress.kmRemaining !== null && `${progress.kmRemaining.toFixed(0)} km ${text.remaining}`}{progress.kmRemaining !== null && progress.daysRemaining !== null && ' · '}{progress.daysRemaining !== null && `${progress.daysRemaining} ${text.days} ${text.remaining}`}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.min(100, progress.ratio * 100)}%`, background: `linear-gradient(90deg, #22c55e, ${maintenanceProgressColor(progress.ratio)})` }} /></div><div className="mt-4 flex justify-between"><button disabled={busy} onClick={complete} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{text.complete}</button><Link href="/maintenance" className="py-2 text-xs font-semibold text-sky-600">{text.all} →</Link></div></>}</section>
}
