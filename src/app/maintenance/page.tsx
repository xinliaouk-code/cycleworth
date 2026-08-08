'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LanguageSwitcher, useLanguage } from '../../components/LanguageProvider'
import { maintenanceName, maintenanceProgress, maintenanceProgressColor, maintenanceStatusText } from '../../lib/maintenance'
import { demoMaintenanceHistory, demoMaintenanceTasks, demoRides } from '../demo/mock-data'

const copy = {
  en: { back: 'Demo dashboard', title: 'Bike maintenance', odometer: 'odometer', banner: 'Demo Mode — browse recommendations and history; saved maintenance actions require an account.', cta: 'Create an account to track your own maintenance history and intervals.', interval: 'interval', time: 'Time-based check', every: 'every', complete: 'complete', remaining: 'remaining', mark: 'Mark completed', adjust: 'Adjust interval', history: 'Maintenance history' },
  zh: { back: '\u6f14\u793a\u4eea\u8868\u76d8', title: '\u81ea\u884c\u8f66\u4fdd\u517b', odometer: '\u7d2f\u8ba1\u91cc\u7a0b', banner: '\u6f14\u793a\u6a21\u5f0f — \u53ef\u67e5\u770b\u4fdd\u517b\u5efa\u8bae\u548c\u5386\u53f2\uff1b\u4fdd\u5b58\u4fdd\u517b\u64cd\u4f5c\u9700\u8981\u8d26\u6237\u3002', cta: '\u521b\u5efa\u8d26\u6237\u540e\u5373\u53ef\u8bb0\u5f55\u4f60\u81ea\u5df1\u7684\u4fdd\u517b\u5386\u53f2\u4e0e\u5468\u671f\u3002', interval: '\u5468\u671f', time: '\u6309\u65f6\u95f4\u68c0\u67e5', every: '\u6bcf', complete: '\u5df2\u5b8c\u6210', remaining: '\u5269\u4f59', mark: '\u6807\u8bb0\u5b8c\u6210', adjust: '\u8c03\u6574\u5468\u671f', history: '\u4fdd\u517b\u5386\u53f2' },
} as const

export default function MaintenancePage() {
  const { lang } = useLanguage()
  const [cta, setCta] = useState(false)
  const text = copy[lang]
  const odometerKm = demoRides.reduce((sum, ride) => sum + ride.distance, 0) / 1000
  const dayUnit = lang === 'zh' ? '\u5929' : 'days'

  return <main className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
    <header className="flex items-center justify-between gap-3"><div><Link href="/demo" className="text-sm font-semibold text-sky-600">&larr; {text.back}</Link><h1 className="mt-2 text-2xl font-bold text-slate-800">{text.title}</h1><p className="mt-1 text-sm text-slate-500">Brompton C Line 12-speed {'\u00b7'} {text.odometer} {odometerKm.toFixed(1)} km</p></div><LanguageSwitcher /></header>
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{text.banner}</div>{cta && <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3 text-sm text-violet-800">{text.cta}</div>}
    <div className="grid gap-3 md:grid-cols-2">{demoMaintenanceTasks.map(task => { const progress = maintenanceProgress(task, odometerKm); return <section key={task.id} className="flex min-h-[245px] flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-slate-800">{maintenanceName(task, lang)}</h2><span className="text-sm font-bold text-amber-600">{maintenanceStatusText(progress.status, lang)}</span></div><p className="mt-2 text-xs text-slate-500">{task.distance_interval_km ? `${task.distance_interval_km} km ${text.interval}` : text.time}{task.time_interval_days ? ` ${text.every} ${task.time_interval_days} ${dayUnit}` : ''}</p><p className="mt-3 text-sm text-slate-600">{Math.round(progress.ratio * 100)}% {text.complete} {'\u00b7'} {progress.kmRemaining !== null ? `${progress.kmRemaining.toFixed(0)} km ${text.remaining}` : ''}{progress.daysRemaining !== null ? `${progress.kmRemaining !== null ? ' \u00b7 ' : ''}${progress.daysRemaining} ${dayUnit} ${text.remaining}` : ''}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.min(100, progress.ratio * 100)}%`, background: `linear-gradient(90deg, #22c55e, ${maintenanceProgressColor(progress.ratio)})` }} /></div><p className="mt-3 text-xs text-slate-500">{task.notes}</p><div className="mt-auto flex gap-2 pt-4"><button onClick={() => setCta(true)} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white">{text.mark}</button><button onClick={() => setCta(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">{text.adjust}</button></div></section> })}</div>
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6"><h2 className="font-semibold text-slate-800">{text.history}</h2><div className="mt-4 space-y-3">{demoMaintenanceHistory.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 text-sm last:border-0"><div><p className="font-medium text-slate-800">{maintenanceName({ task_type: item.task_type, display_name: item.task_type }, lang)}</p><p className="mt-1 text-xs text-slate-500">{item.notes}</p></div><div className="text-right text-xs text-slate-500">{new Date(item.completed_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB')}<br />{item.odometer_km.toFixed(1)} km{item.cost ? ` \u00b7 \u00a3${item.cost.toFixed(2)}` : ''}</div></div>)}</div></section>
  </div></main>
}
