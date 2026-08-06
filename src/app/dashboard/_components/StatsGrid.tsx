'use client'

import { useLanguage } from '../../../components/LanguageProvider'

interface StatsGridProps { totalRides: number; totalDistanceKm: string; estimatedSavings: string; totalCalories: number }

export function StatsGrid({ totalRides, totalDistanceKm, estimatedSavings, totalCalories }: StatsGridProps) {
  const { t } = useLanguage()
  const stats = [
    [t.totalRides, `${totalRides}`, t.rides, 'text-slate-400', 'text-slate-800'],
    [t.totalDistance, totalDistanceKm, 'km', 'text-slate-400', 'text-slate-800'],
    [t.totalSavings, `£${estimatedSavings}`, '', 'text-sky-600', 'text-sky-700'],
    ['Estimated calories', `${totalCalories.toLocaleString()} kcal`, '', 'text-orange-500', 'text-orange-600'],
  ]
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">{stats.map(([label, value, unit, labelClass, valueClass]) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm md:p-6"><p className={`text-xs font-medium md:text-sm ${labelClass}`}>{label}</p><p className={`mt-1 text-xl font-bold md:mt-2 md:text-3xl ${valueClass}`}>{label === 'Estimated calories' && '🔥 '}{value} {unit && <span className="text-xs font-normal text-slate-500 md:text-sm">{unit}</span>}</p></div>)}</div>
}
