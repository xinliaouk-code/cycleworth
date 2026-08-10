'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../components/LanguageProvider'
import { supabase } from '../../lib/supabase'
import { defaultMaintenanceTasks, maintenanceName, maintenanceProgress, maintenanceProgressColor, maintenanceStatusText, type MaintenanceTask } from '../../lib/maintenance'
import { demoMaintenanceTasks, demoRides } from '../demo/mock-data'

type HistoryTask = { display_name: string; task_type?: string }
type HistoryEvent = { id: string; completed_at: string; odometer_km: number; cost: number | null; notes: string | null; bike_maintenance_tasks: HistoryTask | HistoryTask[] | null }

export default function MaintenancePage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [userId, setUserId] = useState('')
  const [isDemo, setIsDemo] = useState(false)
  const [odometerKm, setOdometerKm] = useState(0)
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const text = lang === 'zh' ? {
    back: '返回仪表盘', title: '自行车保养', odometer: '当前里程', description: '保养周期可按你的骑行情况调整。置为已完成后，当前里程会写入保养历史。', noDistance: '不按里程', noTime: '不按时间', progress: '当前进度', remaining: '剩余', days: '天', complete: '标记为已完成', adjust: '调整周期', disable: '停用', enable: '重新启用', disabled: '已停用', history: '保养历史', noHistory: '暂无保养记录', cost: '可选：本次费用 (£)', notes: '可选：备注', distancePrompt: '距离周期 (km)，留空表示不按里程提醒', timePrompt: '时间周期 (天)，留空表示不按时间提醒',
  } : {
    back: 'Back to dashboard', title: 'Bike maintenance', odometer: 'Current odometer', description: 'Adjust the intervals to suit your riding. Completing a task records the current odometer in the maintenance history.', noDistance: 'No distance interval', noTime: 'No time interval', progress: 'Current progress', remaining: 'remaining', days: 'days', complete: 'Mark as completed', adjust: 'Adjust intervals', disable: 'Disable', enable: 'Re-enable', disabled: 'Disabled', history: 'Maintenance history', noHistory: 'No maintenance records yet', cost: 'Optional: cost (£)', notes: 'Optional: notes', distancePrompt: 'Distance interval (km); leave blank for no distance reminder', timePrompt: 'Time interval (days); leave blank for no time reminder',
  }

  const load = async (id: string) => {
    const { data: rides } = await supabase.from('rides').select('distance').eq('user_id', id)
    const totalKm = (rides ?? []).reduce((sum, ride) => sum + (Number(ride.distance) || 0), 0) / 1000
    setOdometerKm(totalKm)
    await supabase.from('bike_maintenance_tasks').upsert(defaultMaintenanceTasks.map(([task_type, display_name, distance_interval_km, time_interval_days]) => ({ user_id: id, task_type, display_name, distance_interval_km, time_interval_days, last_completed_odometer_km: totalKm })), { onConflict: 'user_id,task_type', ignoreDuplicates: true })
    const [{ data: taskRows }, { data: historyRows }] = await Promise.all([
      supabase.from('bike_maintenance_tasks').select('*').eq('user_id', id).order('display_name'),
      supabase.from('bike_maintenance_history').select('id,completed_at,odometer_km,cost,notes,bike_maintenance_tasks(display_name,task_type)').eq('user_id', id).order('completed_at', { ascending: false }),
    ])
    setTasks((taskRows ?? []) as MaintenanceTask[]); setHistory((historyRows ?? []) as HistoryEvent[])
  }

  useEffect(() => { 
    supabase.auth.getSession().then(({ data: { session } }) => { 
      if (!session?.user) { 
        setIsDemo(true)
        const demoKm = demoRides.reduce((sum, r) => sum + (r.distance || 0), 0) / 1000
        setOdometerKm(demoKm)
        setTasks(demoMaintenanceTasks)
        setHistory([
          { id: 'h1', completed_at: new Date(Date.now() - 18 * 86400000).toISOString(), odometer_km: 240, cost: 12, notes: '链条深层清洁与上油', bike_maintenance_tasks: { display_name: '链条清洁与润滑 (Clean & lube chain)' } },
          { id: 'h2', completed_at: new Date(Date.now() - 42 * 86400000).toISOString(), odometer_km: 120, cost: 25, notes: '更换瑞士 Stop 煞车皮', bike_maintenance_tasks: { display_name: '煞车片与拉线检查 (Brake pads & cable check)' } }
        ])
        return 
      } 
      setUserId(session.user.id); 
      load(session.user.id) 
    }) 
  }, [router])

  const complete = async (task: MaintenanceTask) => { 
    const cost = window.prompt(text.cost); 
    const notes = window.prompt(text.notes); 
    if (isDemo) {
      setHistory(curr => [{ id: Date.now().toString(), completed_at: new Date().toISOString(), odometer_km: odometerKm, cost: cost ? Number(cost) : null, notes: notes || null, bike_maintenance_tasks: { display_name: task.display_name } }, ...curr])
      setTasks(curr => curr.map(t => t.id === task.id ? { ...t, last_completed_at: new Date().toISOString(), last_completed_odometer_km: odometerKm } : t))
      return
    }
    await supabase.from('bike_maintenance_history').insert({ task_id: task.id, user_id: userId, odometer_km: odometerKm, cost: cost ? Number(cost) : null, notes: notes || null }); 
    await supabase.from('bike_maintenance_tasks').update({ last_completed_at: new Date().toISOString(), last_completed_odometer_km: odometerKm }).eq('id', task.id); 
    load(userId) 
  }

  const editIntervals = async (task: MaintenanceTask) => { 
    const km = window.prompt(text.distancePrompt, task.distance_interval_km?.toString() ?? ''); 
    if (km === null) return; 
    const days = window.prompt(text.timePrompt, task.time_interval_days?.toString() ?? ''); 
    if (days === null) return; 
    if (isDemo) {
      setTasks(curr => curr.map(t => t.id === task.id ? { ...t, distance_interval_km: km.trim() ? Number(km) : null, time_interval_days: days.trim() ? Number(days) : null } : t))
      return
    }
    await supabase.from('bike_maintenance_tasks').update({ distance_interval_km: km.trim() ? Number(km) : null, time_interval_days: days.trim() ? Number(days) : null }).eq('id', task.id); 
    load(userId) 
  }

  const toggleActive = async (task: MaintenanceTask) => { 
    if (isDemo) {
      setTasks(curr => curr.map(t => t.id === task.id ? { ...t, active: !t.active } : t))
      return
    }
    await supabase.from('bike_maintenance_tasks').update({ active: !task.active }).eq('id', task.id); 
    load(userId) 
  }

  const locale = lang === 'zh' ? 'zh-CN' : 'en-GB'
  return <main className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-4xl space-y-5"><Link href="/dashboard" className="text-sm font-medium text-sky-600">← {text.back}</Link><div><h1 className="text-2xl font-bold text-slate-800">{text.title}</h1><p className="mt-1 text-sm text-slate-500">Brompton C Line 12-speed · {text.odometer} {odometerKm.toFixed(1)} km</p></div><p className="text-sm text-slate-500">{text.description}</p><div className="grid gap-3 md:grid-cols-2">{tasks.map(task => { const progress = maintenanceProgress(task, odometerKm); return <section key={task.id} className={`flex min-h-[220px] flex-col rounded-2xl border bg-white p-4 shadow-sm ${task.active ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}><div className="flex justify-between gap-3"><h2 className="font-semibold text-slate-800">{maintenanceName(task, lang)}</h2><span className="text-sm font-bold text-sky-600">{task.active ? maintenanceStatusText(progress.status, lang) : text.disabled}</span></div><p className="mt-2 text-xs text-slate-500">{task.distance_interval_km ? `${task.distance_interval_km} km` : text.noDistance}{task.distance_interval_km && task.time_interval_days ? ' · ' : ''}{task.time_interval_days ? `${task.time_interval_days} ${text.days}` : text.noTime}</p>{task.active && <><p className="mt-2 text-sm text-slate-600">{text.progress} {Math.round(progress.ratio * 100)}% · {progress.kmRemaining !== null && `${text.remaining} ${progress.kmRemaining.toFixed(0)} km`}{progress.kmRemaining !== null && progress.daysRemaining !== null && ' · '}{progress.daysRemaining !== null && `${text.remaining} ${progress.daysRemaining} ${text.days}`}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.min(100, progress.ratio * 100)}%`, background: `linear-gradient(90deg, #22c55e, ${maintenanceProgressColor(progress.ratio)})` }} /></div></>}<div className="mt-auto flex flex-wrap gap-2 pt-4"><button onClick={() => complete(task)} disabled={!task.active} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">{text.complete}</button><button onClick={() => editIntervals(task)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">{text.adjust}</button><button onClick={() => toggleActive(task)} className={`rounded-xl px-3 py-2 text-xs font-medium ${task.active ? 'border border-slate-200 text-slate-600' : 'bg-emerald-600 text-white shadow-sm'}`}>{task.active ? text.disable : text.enable}</button></div></section>})}</div><section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><h2 className="font-semibold text-slate-800">{text.history}</h2><div className="mt-3 space-y-2 text-sm">{history.length ? history.map(event => { const linkedTask = event.bike_maintenance_tasks; const historyTask = Array.isArray(linkedTask) ? linkedTask[0] : linkedTask; return <div key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-50 pb-2"><span>{historyTask ? maintenanceName({ task_type: historyTask.task_type ?? '', display_name: historyTask.display_name }, lang) : ''}</span><span className="text-slate-500">{new Date(event.completed_at).toLocaleDateString(locale)} · {Number(event.odometer_km).toFixed(1)} km{event.cost !== null ? ` · £${Number(event.cost).toFixed(2)}` : ''}{event.notes ? ` · ${event.notes}` : ''}</span></div> }) : <p className="text-slate-400">{text.noHistory}</p>}</div></section></div></main>
}
