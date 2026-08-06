'use client'

import { useMemo, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import type { Ride } from '../_lib/utils'

function monday(date: Date) { const value = new Date(date.getFullYear(), date.getMonth(), date.getDate()); value.setDate(value.getDate() - ((value.getDay() + 6) % 7)); return value }

export function RideHeatmap({ rides }: { rides: Ride[] }) {
  const { lang } = useLanguage(); const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1)); const [collapsed, setCollapsed] = useState(false)
  const weeks = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1); const last = new Date(month.getFullYear(), month.getMonth() + 1, 0); const start = monday(first); const result: Array<{ start: Date; end: Date; km: number }> = []
    for (let date = new Date(start); date <= last; date.setDate(date.getDate() + 7)) { const weekStart = new Date(date); const weekEnd = new Date(date); weekEnd.setDate(date.getDate() + 6); let km = 0; rides.forEach(ride => { const rideDate = new Date(ride.start_date); if (rideDate >= weekStart && rideDate <= weekEnd) km += (Number(ride.distance) || 0) / 1000 }); result.push({ start: weekStart, end: weekEnd, km }) }
    return result
  }, [month, rides])
  const max = Math.max(1, ...weeks.map(week => week.km)); const title = month.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'long' }); const format = (date: Date) => date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'numeric', day: 'numeric' })
  const color = (km: number) => km === 0 ? 'border-slate-100 bg-slate-50 text-slate-400' : km / max < .4 ? 'border-emerald-100 bg-emerald-100 text-emerald-800' : km / max < .75 ? 'border-emerald-200 bg-emerald-400 text-emerald-950' : 'border-emerald-700 bg-emerald-700 text-white'
  return <section className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm md:p-6"><div className="flex items-start justify-between"><div className="flex items-start gap-2"><button onClick={() => setCollapsed(value => !value)} className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{collapsed ? '+' : '−'}</button><div><h2 className="text-base font-semibold text-slate-800 md:text-lg">{lang === 'zh' ? '月度周骑行' : 'Monthly weekly rides'}</h2>{!collapsed && <p className="mt-0.5 text-xs text-slate-400">{lang === 'zh' ? '按每周总骑行里程显示' : 'Total riding distance by week'}</p>}</div></div>{!collapsed && <div className="flex items-center gap-2"><button onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">‹</button><span className="min-w-24 text-center text-sm font-semibold text-slate-700">{title}</span><button onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">›</button></div>}</div>{!collapsed && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{weeks.map((week, index) => <div key={week.start.toISOString()} title={`${format(week.start)} – ${format(week.end)}: ${week.km.toFixed(1)} km`} className={`rounded-xl border p-3 ${color(week.km)}`}><p className="text-xs font-medium opacity-80">{lang === 'zh' ? `第 ${index + 1} 周` : `Week ${index + 1}`}</p><p className="mt-1 text-[10px] opacity-75">{format(week.start)} – {format(week.end)}</p><p className="mt-2 text-lg font-bold">{week.km ? `${week.km.toFixed(1)} km` : '—'}</p></div>)}</div>}</section>
}
