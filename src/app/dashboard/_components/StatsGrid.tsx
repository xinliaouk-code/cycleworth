'use client'

import { useState } from 'react'
import { Bike, Route, PiggyBank, Flame, ChevronDown, ChevronUp } from 'lucide-react'
import { useLanguage } from '../../../components/LanguageProvider'
import { dashboardCardClass, dashboardCardTitleClass, dashboardCollapseButtonClass, moduleText } from '../_lib/module-ui'

interface StatsGridProps {
  totalRides: number
  totalDistanceKm: string
  estimatedSavings: string
  totalCalories: number
}

export function StatsGrid({ totalRides, totalDistanceKm, estimatedSavings, totalCalories }: StatsGridProps) {
  const { t, lang } = useLanguage()
  const ui = moduleText(lang)
  const [collapsed, setCollapsed] = useState(false)

  const items = [
    {
      label: t.totalRides,
      value: `${totalRides}`,
      unit: t.rides,
      icon: Bike,
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
      valueClass: 'text-slate-900',
    },
    {
      label: t.totalDistance,
      value: totalDistanceKm,
      unit: 'km',
      icon: Route,
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      valueClass: 'text-slate-900',
    },
    {
      label: t.totalSavings,
      value: `£${estimatedSavings}`,
      unit: '',
      icon: PiggyBank,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      valueClass: 'text-emerald-600 font-extrabold',
      accent: true,
    },
    {
      label: ui.calories,
      value: `${totalCalories.toLocaleString()}`,
      unit: 'kcal',
      icon: Flame,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      valueClass: 'text-slate-900',
    },
  ]

  return (
    <section className={dashboardCardClass}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? t.expand : t.collapse}
            className={dashboardCollapseButtonClass}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <h2 className={dashboardCardTitleClass}>{ui.keyStats}</h2>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {items.map((item, idx) => {
            const IconComponent = item.icon
            return (
              <div
                key={idx}
                className={`relative overflow-hidden rounded-xl border p-3.5 transition-all md:p-4 ${
                  item.accent
                    ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-sky-50/30 shadow-xs'
                    : 'border-slate-100 bg-slate-50/60 hover:bg-white hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconBg}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className={`text-2xl font-bold tracking-tight md:text-3xl ${item.valueClass}`}>
                    {item.value}
                  </span>
                  {item.unit && <span className="text-xs font-medium text-slate-400">{item.unit}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

