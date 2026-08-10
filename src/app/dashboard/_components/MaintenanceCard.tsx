'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Wrench, ChevronDown, ChevronUp, CheckCircle, ArrowRight } from 'lucide-react'
import { useLanguage } from '../../../components/LanguageProvider'
import { supabase } from '../../../lib/supabase'
import { defaultMaintenanceTasks, maintenanceName, maintenanceProgress, maintenanceProgressColor, maintenanceStatusText, type MaintenanceTask } from '../../../lib/maintenance'
import { dashboardCardClass, dashboardCollapseButtonClass } from '../_lib/module-ui'

type Props = { userId?: string; odometerKm: number; demoTasks?: MaintenanceTask[]; onDemoCta?: () => void }

export function MaintenanceCard({ userId, odometerKm, demoTasks, onDemoCta }: Props) {
  const { lang, t } = useLanguage()
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const isDemo = Boolean(demoTasks)

  const text = lang === 'zh'
    ? { title: '自行车保养', progress: '当前进度', remaining: '剩余', complete: '标记为已完成', all: '查看全部保养项目', cost: '可选：本次费用 (£)', notes: '可选：备注', days: '天' }
    : { title: 'Bike maintenance', progress: 'Current progress', remaining: 'remaining', complete: 'Mark as completed', all: 'View all maintenance', cost: 'Optional: cost (£)', notes: 'Optional: notes', days: 'days' }

  const load = async () => {
    if (demoTasks) { setTasks(demoTasks); return }
    if (!userId) return
    await supabase.from('bike_maintenance_tasks').upsert(
      defaultMaintenanceTasks.map(([task_type, display_name, distance_interval_km, time_interval_days]) => ({
        user_id: userId, task_type, display_name, distance_interval_km, time_interval_days, last_completed_odometer_km: odometerKm
      })),
      { onConflict: 'user_id,task_type', ignoreDuplicates: true }
    )
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
    const cost = window.prompt(text.cost)
    const notes = window.prompt(text.notes)
    setBusy(true)
    await supabase.from('bike_maintenance_history').insert({
      task_id: urgent.id,
      user_id: userId,
      odometer_km: odometerKm,
      cost: cost ? Number(cost) : null,
      notes: notes || null
    })
    await supabase.from('bike_maintenance_tasks').update({
      last_completed_at: new Date().toISOString(),
      last_completed_odometer_km: odometerKm
    }).eq('id', urgent.id)
    await load()
    setBusy(false)
  }

  const badgeTheme = progress.status === '逾期'
    ? 'bg-rose-100 text-rose-700 border-rose-200'
    : progress.status === '到期'
    ? 'bg-orange-100 text-orange-700 border-orange-200'
    : progress.status === '即将到期'
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200'

  return (
    <section className={dashboardCardClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? t.expand : t.collapse}
            className={`${dashboardCollapseButtonClass} mt-0.5`}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Wrench className="h-3.5 w-3.5 text-slate-400" />
              <span>{text.title}</span>
            </div>
            {!collapsed && (
              <h2 className="mt-1 text-base font-bold text-slate-800 md:text-lg">
                {maintenanceName(urgent, lang)}
              </h2>
            )}
          </div>
        </div>

        {!collapsed && (
          <span className={`inline-flex shrink-0 items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeTheme}`}>
            {maintenanceStatusText(progress.status, lang)}
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="mt-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between text-xs font-medium text-slate-600 gap-1">
            <span>
              {text.progress} <strong className="text-slate-900">{Math.round(progress.ratio * 100)}%</strong>
            </span>
            <span className="text-slate-500">
              {progress.kmRemaining !== null && `${progress.kmRemaining.toFixed(0)} km ${text.remaining}`}
              {progress.kmRemaining !== null && progress.daysRemaining !== null && ' · '}
              {progress.daysRemaining !== null && `${progress.daysRemaining} ${text.days} ${text.remaining}`}
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(0, progress.ratio * 100))}%`,
                background: `linear-gradient(90deg, #10b981, ${maintenanceProgressColor(progress.ratio)})`
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              disabled={busy}
              onClick={complete}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{isDemo ? 'Create account to update' : text.complete}</span>
            </button>

            {isDemo ? (
              <Link
                href="/login"
                className="inline-flex min-h-[40px] items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition"
              >
                <span>Create account</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                href="/maintenance"
                className="inline-flex min-h-[40px] items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition"
              >
                <span>{text.all}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

