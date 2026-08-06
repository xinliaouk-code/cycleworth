'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { defaultMaintenanceTasks, maintenanceProgress, type MaintenanceTask } from '../../lib/maintenance'

type HistoryEvent = {
  id: string
  completed_at: string
  odometer_km: number
  cost: number | null
  notes: string | null
  bike_maintenance_tasks: { display_name: string }[] | null
}

export default function MaintenancePage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [odometerKm, setOdometerKm] = useState(0)
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [history, setHistory] = useState<HistoryEvent[]>([])

  const load = async (id: string) => {
    const { data: rides } = await supabase.from('rides').select('distance').eq('user_id', id)
    const totalKm = (rides ?? []).reduce((sum, ride) => sum + (Number(ride.distance) || 0), 0) / 1000
    setOdometerKm(totalKm)

    await supabase.from('bike_maintenance_tasks').upsert(
      defaultMaintenanceTasks.map(([task_type, display_name, distance_interval_km, time_interval_days]) => ({
        user_id: id, task_type, display_name, distance_interval_km, time_interval_days,
        last_completed_odometer_km: totalKm,
      })),
      { onConflict: 'user_id,task_type', ignoreDuplicates: true },
    )

    const [{ data: taskRows }, { data: historyRows }] = await Promise.all([
      supabase.from('bike_maintenance_tasks').select('*').eq('user_id', id).order('display_name'),
      supabase.from('bike_maintenance_history').select('id,completed_at,odometer_km,cost,notes,bike_maintenance_tasks(display_name)').eq('user_id', id).order('completed_at', { ascending: false }),
    ])
    setTasks((taskRows ?? []) as MaintenanceTask[])
    setHistory((historyRows ?? []) as HistoryEvent[])
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push('/login'); return }
      setUserId(session.user.id)
      load(session.user.id)
    })
  }, [router])

  const complete = async (task: MaintenanceTask) => {
    const cost = window.prompt('\u53ef\u9009\uff1a\u672c\u6b21\u8d39\u7528 (£)')
    const notes = window.prompt('\u53ef\u9009\uff1a\u5907\u6ce8')
    await supabase.from('bike_maintenance_history').insert({ task_id: task.id, user_id: userId, odometer_km: odometerKm, cost: cost ? Number(cost) : null, notes: notes || null })
    await supabase.from('bike_maintenance_tasks').update({ last_completed_at: new Date().toISOString(), last_completed_odometer_km: odometerKm }).eq('id', task.id)
    load(userId)
  }

  const editIntervals = async (task: MaintenanceTask) => {
    const km = window.prompt('\u8ddd\u79bb\u5468\u671f (km)\uff0c\u7559\u7a7a\u8868\u793a\u4e0d\u6309\u91cc\u7a0b\u63d0\u9192', task.distance_interval_km?.toString() ?? '')
    if (km === null) return
    const days = window.prompt('\u65f6\u95f4\u5468\u671f (\u5929)\uff0c\u7559\u7a7a\u8868\u793a\u4e0d\u6309\u65f6\u95f4\u63d0\u9192', task.time_interval_days?.toString() ?? '')
    if (days === null) return
    await supabase.from('bike_maintenance_tasks').update({
      distance_interval_km: km.trim() ? Number(km) : null,
      time_interval_days: days.trim() ? Number(days) : null,
    }).eq('id', task.id)
    load(userId)
  }

  const toggleActive = async (task: MaintenanceTask) => {
    await supabase.from('bike_maintenance_tasks').update({ active: !task.active }).eq('id', task.id)
    load(userId)
  }

  return <main className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-4xl space-y-5">
    <Link href="/dashboard" className="text-sm font-medium text-sky-600">← \u8fd4\u56de\u4eea\u8868\u76d8</Link>
    <div><h1 className="text-2xl font-bold text-slate-800">\u81ea\u884c\u8f66\u4fdd\u517b</h1><p className="mt-1 text-sm text-slate-500">Brompton C Line 12-speed · \u5f53\u524d\u91cc\u7a0b {odometerKm.toFixed(1)} km</p></div>
    <p className="text-sm text-slate-500">\u4fdd\u517b\u5468\u671f\u53ef\u6309\u4f60\u7684\u9a91\u884c\u60c5\u51b5\u8c03\u6574\u3002\u7f6e\u4e3a\u5df2\u5b8c\u6210\u540e\uff0c\u5f53\u524d\u91cc\u7a0b\u4f1a\u5199\u5165\u4fdd\u517b\u5386\u53f2\u3002</p>
    <div className="grid gap-3 md:grid-cols-2">{tasks.map(task => { const progress = maintenanceProgress(task, odometerKm); return <section key={task.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${task.active ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
      <div className="flex justify-between gap-3"><h2 className="font-semibold text-slate-800">{task.display_name}</h2><span className="text-sm font-bold text-sky-600">{task.active ? progress.status : '\u5df2\u505c\u7528'}</span></div>
      <p className="mt-2 text-xs text-slate-500">{task.distance_interval_km ? `${task.distance_interval_km} km` : '\u4e0d\u6309\u91cc\u7a0b'}{task.distance_interval_km && task.time_interval_days ? ' · ' : ''}{task.time_interval_days ? `${task.time_interval_days} \u5929` : '\u4e0d\u6309\u65f6\u95f4'}</p>
      {task.active && <><p className="mt-2 text-sm text-slate-600">\u5f53\u524d\u8fdb\u5ea6 {Math.round(progress.ratio * 100)}% · {progress.kmRemaining !== null && `\u5269\u4f59 ${progress.kmRemaining.toFixed(0)} km`}{progress.kmRemaining !== null && progress.daysRemaining !== null && ' · '}{progress.daysRemaining !== null && `\u5269\u4f59 ${progress.daysRemaining} \u5929`}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, progress.ratio * 100)}%` }} /></div></>}
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => complete(task)} disabled={!task.active} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">\u6807\u8bb0\u4e3a\u5df2\u5b8c\u6210</button><button onClick={() => editIntervals(task)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">\u8c03\u6574\u5468\u671f</button><button onClick={() => toggleActive(task)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">{task.active ? '\u505c\u7528' : '\u542f\u7528'}</button></div>
    </section>})}</div>
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><h2 className="font-semibold text-slate-800">\u4fdd\u517b\u5386\u53f2</h2><div className="mt-3 space-y-2 text-sm">{history.length ? history.map(event => <div key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-50 pb-2"><span>{event.bike_maintenance_tasks?.[0]?.display_name}</span><span className="text-slate-500">{new Date(event.completed_at).toLocaleDateString('zh-CN')} · {Number(event.odometer_km).toFixed(1)} km{event.cost !== null ? ` · £${Number(event.cost).toFixed(2)}` : ''}{event.notes ? ` · ${event.notes}` : ''}</span></div>) : <p className="text-slate-400">\u6682\u65e0\u4fdd\u517b\u8bb0\u5f55</p>}</div></section>
  </div></main>
}
