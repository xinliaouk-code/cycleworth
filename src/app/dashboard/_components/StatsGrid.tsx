'use client'

import { useId, useState } from 'react'
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
  const detailsId = useId()
  const [collapsed, setCollapsed] = useState(false)

  const items = [
    {
      label: t.totalRides,
      shortLabel: lang === 'zh' ? '总骑行' : 'Rides',
      value: `${totalRides}`,
      unit: t.rides,
      icon: Bike,
      valueClass: 'text-slate-900',
    },
    {
      label: t.totalDistance,
      shortLabel: lang === 'zh' ? '总里程' : 'Distance',
      value: totalDistanceKm,
      unit: 'km',
      icon: Route,
      valueClass: 'text-slate-900',
    },
    {
      label: t.totalSavings,
      shortLabel: lang === 'zh' ? '已节省' : 'Savings',
      value: `£${estimatedSavings}`,
      unit: '',
      icon: PiggyBank,
      valueClass: 'text-emerald-600 font-extrabold',
      accent: true,
    },
    {
      label: ui.calories,
      shortLabel: lang === 'zh' ? '预估热量' : 'Calories',
      value: `${totalCalories.toLocaleString()}`,
      unit: 'kcal',
      icon: Flame,
      valueClass: 'text-slate-900',
    },
  ]

  return (
    <section aria-label={ui.keyStats} className={dashboardCardClass}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={dashboardCardTitleClass}>{ui.keyStats}</h2>
        <button type="button" onClick={() => setCollapsed(value => !value)}
          aria-label={collapsed ? t.expand : t.collapse} aria-expanded={!collapsed} aria-controls={detailsId}
          className={`${dashboardCollapseButtonClass} h-11! w-11! -mr-1`}>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div id={detailsId} className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {items.map((item, idx) => {
            const IconComponent = item.icon
            return (
              <div
                key={idx}
                className={`relative overflow-hidden rounded-xl border px-3 py-2.5 transition-all md:p-4 ${
                  item.accent
                    ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-sky-50/30 shadow-xs'
                    : 'border-slate-100 bg-slate-50/60 hover:bg-white hover:shadow-xs'
                }`}
              >
                <div className="flex items-center gap-1.5 text-slate-500" title={item.label}>
                  <IconComponent className={`h-3.5 w-3.5 shrink-0 ${item.accent ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden="true" />
                  <span className="text-[11px] font-medium md:text-xs">{item.shortLabel}</span>
                </div>

                <div className="mt-1 flex items-baseline gap-1">
                  <span className={`text-xl font-bold tabular-nums tracking-tight md:text-2xl ${item.valueClass}`}>
                    {item.value}
                  </span>
                  {item.unit && <span className="text-[10px] font-medium text-slate-400 md:text-xs">{item.unit}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

