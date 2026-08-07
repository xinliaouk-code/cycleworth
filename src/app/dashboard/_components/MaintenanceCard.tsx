'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import { maintenanceName, maintenanceProgress, maintenanceProgressColor, maintenanceStatusText, type MaintenanceTask } from '../../../lib/maintenance'

type Props = { odometerKm: number; demoTasks: MaintenanceTask[]; onDemoCta?: () => void }

// The frozen demo branch only renders mock maintenance tasks. Keeping this as
// the shared dashboard card preserves the UI without importing Supabase.
export function MaintenanceCard({ odometerKm, demoTasks, onDemoCta }: Props) {
  const { lang } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)
  const text = lang === 'zh'
    ? {
        title: '\u81ea\u884c\u8f66\u4fdd\u517b\u5efa\u8bae',
        progress: '\u5f53\u524d\u8fdb\u5ea6',
        remaining: '\u5269\u4f59',
        days: '\u5929',
        update: '\u521b\u5efa\u8d26\u6237\u540e\u5373\u53ef\u66f4\u65b0',
        all: '\u67e5\u770b\u5168\u90e8',
      }
    : {
        title: 'Bike maintenance',
        progress: 'Current progress',
        remaining: 'remaining',
        days: 'days',
        update: 'Create an account to update',
        all: 'View all',
      }

  const urgent = [...demoTasks].sort(
    (a, b) => maintenanceProgress(b, odometerKm).ratio - maintenanceProgress(a, odometerKm).ratio,
  )[0]
  if (!urgent) return null

  const progress = maintenanceProgress(urgent, odometerKm)
  const color = progress.status === '\u903e\u671f'
    ? 'text-rose-600'
    : progress.status === '\u5230\u671f'
      ? 'text-orange-600'
      : progress.status === '\u5373\u5c06\u5230\u671f'
        ? 'text-amber-600'
        : 'text-emerald-600'

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <button
            onClick={() => setCollapsed(value => !value)}
            aria-label={collapsed ? 'Expand maintenance advice' : 'Collapse maintenance advice'}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base font-bold text-slate-600"
          >
            {collapsed ? '+' : '\u2212'}
          </button>
          <div>
            <p className="text-xs font-medium text-slate-400">{text.title}</p>
            {!collapsed && <h2 className="mt-1 font-semibold text-slate-800">{maintenanceName(urgent, lang)}</h2>}
          </div>
        </div>
        {!collapsed && <span className={`pt-1 text-sm font-bold ${color}`}>{maintenanceStatusText(progress.status, lang)}</span>}
      </div>

      {!collapsed && <>
        <p className="mt-3 text-sm text-slate-500">
          {text.progress} {Math.round(progress.ratio * 100)}% \u00b7 {progress.kmRemaining !== null && `${progress.kmRemaining.toFixed(0)} km ${text.remaining}`}
          {progress.kmRemaining !== null && progress.daysRemaining !== null && ' \u00b7 '}
          {progress.daysRemaining !== null && `${progress.daysRemaining} ${text.days} ${text.remaining}`}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, progress.ratio * 100)}%`, background: `linear-gradient(90deg, #22c55e, ${maintenanceProgressColor(progress.ratio)})` }} />
        </div>
        <div className="mt-4 flex justify-between gap-3">
          <button onClick={onDemoCta} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white">{text.update}</button>
          <Link href="/maintenance" className="py-2 text-xs font-semibold text-sky-600">{text.all} \u2192</Link>
        </div>
      </>}
    </section>
  )
}
