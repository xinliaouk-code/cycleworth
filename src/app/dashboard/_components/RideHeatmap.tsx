'use client'

import { useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useLanguage } from '../../../components/LanguageProvider'
import type { Ride } from '../_lib/utils'
import { dashboardCardClass, dashboardCardTitleClass, dashboardCollapseButtonClass, moduleText } from '../_lib/module-ui'

function monday(date: Date) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7))
  return value
}

export function RideHeatmap({ rides }: { rides: Ride[] }) {
  const { lang, t } = useLanguage()
  const ui = moduleText(lang)
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [collapsed, setCollapsed] = useState(false)

  const weeks = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    const start = monday(first)
    const result: Array<{ start: Date; end: Date; km: number }> = []

    for (let date = new Date(start); date <= last; date.setDate(date.getDate() + 7)) {
      const weekStart = new Date(date)
      const weekEnd = new Date(date)
      weekEnd.setDate(date.getDate() + 6)
      let km = 0
      rides.forEach(ride => {
        const rideDate = new Date(ride.start_date)
        if (rideDate >= weekStart && rideDate <= weekEnd) km += (Number(ride.distance) || 0) / 1000
      })
      result.push({ start: weekStart, end: weekEnd, km })
    }
    return result
  }, [month, rides])

  const max = Math.max(1, ...weeks.map(week => week.km))
  const title = month.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'long' })
  const format = (date: Date) => date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'numeric', day: 'numeric' })

  const colorStyle = (km: number) => {
    if (km === 0) return 'border-slate-100 bg-slate-50/70 text-slate-400'
    const ratio = km / max
    if (ratio < 0.4) return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    if (ratio < 0.75) return 'border-emerald-300 bg-emerald-100 text-emerald-950 font-bold'
    return 'border-emerald-600 bg-emerald-600 text-white font-extrabold shadow-xs'
  }

  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? t.expand : t.collapse}
            className={dashboardCollapseButtonClass}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className="min-w-0">
            <h2 className={dashboardCardTitleClass}>{ui.monthlyWeeklyRides}</h2>
            {!collapsed && <p className="text-xs font-medium text-slate-400">{ui.weeklyDistance}</p>}
          </div>
        </div>

        {!collapsed && (
          <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
            <button
              aria-label="Previous month"
              onClick={() => setMonth(curr => new Date(curr.getFullYear(), curr.getMonth() - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 min-w-[120px] justify-center">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {title}
            </span>
            <button
              aria-label="Next month"
              onClick={() => setMonth(curr => new Date(curr.getFullYear(), curr.getMonth() + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {weeks.map((week, idx) => (
            <div
              key={week.start.toISOString()}
              title={`${format(week.start)} – ${format(week.end)}: ${week.km.toFixed(1)} km`}
              className={`rounded-xl border p-3 transition-all hover:scale-[1.02] ${colorStyle(week.km)}`}
            >
              <span className="block text-[11px] font-semibold opacity-80">
                {lang === 'zh' ? `${ui.week}${idx + 1}周` : `${ui.week} ${idx + 1}`}
              </span>
              <span className="block text-[10px] opacity-70">
                {format(week.start)} - {format(week.end)}
              </span>
              <span className="mt-2 block text-lg font-bold tracking-tight">
                {week.km ? `${week.km.toFixed(1)} km` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

