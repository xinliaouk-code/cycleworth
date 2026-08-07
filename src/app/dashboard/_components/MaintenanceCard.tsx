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
    ? { title: '自行车保养建议', progress: '当前进度', remaining: '剩余', days: '天' }
    : { title: 'Bike maintenance', progress: 'Current progress', remaining: 'remaining', days: 'days' }
  const urgent = [...demoTasks].sort((a, b) => maintenanceProgress(b, odometerKm).ratio - maintenanceProgress(a, odometerKm).ratio)[0]
  if (!urgent) return null
  const progress = maintenanceProgress(urgent, odometerKm)
  const color = progress.status === '逾期' ? 'text-rose-600' : progress.status === '到期' ? 'text-orange-600' : progress.status === '即将到期' ? 'text-amber-600' : 'text-emerald-600'

  return <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2"><button onClick={() => setCollapsed(value => !value)} className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base font-bold text-slate-600">{collapsed ? '+' : '−'}</button><div><p className="text-xs font-medium text-slate-400">{text.title}</p>{!collapsed && <h2 className="mt-1 font-semibold text-slate-800">{maintenanceName(urgent, lang)}</h2>}</div></div>{!collapsed && <span className={`pt-1 text-sm font-bold ${color}`}>{maintenanceStatusText(progress.status, lang)}</span>}</div>{!collapsed && <><p className="mt-3 text-sm text-slate-500">{text.progress} {Math.round(progress.ratio * 100)}% · {progress.kmRemaining !== null && `${progress.kmRemaining.toFixed(0)} km ${text.remaining}`}{progress.kmRemaining !== null && progress.daysRemaining !== null && ' · '}{progress.daysRemaining !== null && `${progress.daysRemaining} ${text.days} ${text.remaining}`}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.min(100, progress.ratio * 100)}%`, background: `linear-gradient(90deg, #22c55e, ${maintenanceProgressColor(progress.ratio)})` }} /></div><div className="mt-4 flex justify-between"><button onClick={onDemoCta} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white">Create an account to update</button><Link href="/login" className="py-2 text-xs font-semibold text-sky-600">Create account →</Link></div></>}</section>
}
