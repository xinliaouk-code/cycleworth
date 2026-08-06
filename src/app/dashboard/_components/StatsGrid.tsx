'use client'

import { useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'

interface StatsGridProps { totalRides: number; totalDistanceKm: string; estimatedSavings: string; totalCalories: number }

export function StatsGrid({ totalRides, totalDistanceKm, estimatedSavings, totalCalories }: StatsGridProps) {
  const { t, lang } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)
  const caloriesLabel = lang === 'zh' ? '\u5361\u8def\u91cc\u9884\u4f30' : 'Estimated calories'
  const stats = [
    [t.totalRides, `${totalRides}`, t.rides, 'text-slate-400', 'text-slate-800', false],
    [t.totalDistance, totalDistanceKm, 'km', 'text-slate-400', 'text-slate-800', false],
    [t.totalSavings, `£${estimatedSavings}`, '', 'text-sky-600', 'text-sky-700', false],
    [caloriesLabel, `🔥 ${totalCalories.toLocaleString()} kcal`, '', 'text-orange-500', 'text-orange-600', true],
  ] as const
  return <section className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm md:p-5"><div className="flex items-center gap-2"><button onClick={() => setCollapsed(value => !value)} className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{collapsed ? '+' : '−'}</button><h2 className="text-base font-semibold text-slate-800">{lang === 'zh' ? '\u6838\u5fc3\u7edf\u8ba1' : 'Key statistics'}</h2></div>{!collapsed && <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">{stats.map(([label, value, unit, labelClass, valueClass, noWrap]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 md:p-4"><p className={`text-xs font-medium md:text-sm ${labelClass}`}>{label}</p><p className={`mt-1 text-xl font-bold md:mt-2 md:text-3xl ${valueClass} ${noWrap ? 'whitespace-nowrap text-[1.1rem] lg:text-2xl' : ''}`}>{value} {unit && <span className="text-xs font-normal text-slate-500 md:text-sm">{unit}</span>}</p></div>)}</div>}</section>
}
