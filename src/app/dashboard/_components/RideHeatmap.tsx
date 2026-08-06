'use client'

import { useMemo, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import type { Ride } from '../_lib/utils'

function startOfWeek(date: Date) { const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate()); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); return copy }

export function RideHeatmap({ rides }: { rides: Ride[] }) {
  const { lang } = useLanguage()
  const [week, setWeek] = useState(() => startOfWeek(new Date()))
  const values = useMemo(() => { const map = new Map<string, number>(); rides.forEach(ride => { const key = ride.start_date?.slice(0, 10); if (key) map.set(key, (map.get(key) ?? 0) + (Number(ride.distance) || 0) / 1000) }); return map }, [rides])
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(week); date.setDate(week.getDate() + index); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; return { date, km: values.get(key) ?? 0, key } })
  const max = Math.max(1, ...days.map(day => day.km)); const labels = lang === 'zh' ? ['周一','周二','周三','周四','周五','周六','周日'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const range = `${week.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', day: 'numeric' })} – ${days[6].date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const color = (km: number) => km === 0 ? 'border-slate-100 bg-slate-50 text-slate-400' : km / max < .4 ? 'border-emerald-100 bg-emerald-100 text-emerald-800' : km / max < .75 ? 'border-emerald-200 bg-emerald-400 text-emerald-950' : 'border-emerald-700 bg-emerald-700 text-white'
  return <section className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm md:p-6"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-slate-800 md:text-lg">{lang === 'zh' ? '本周骑行' : 'Weekly rides'}</h2><p className="mt-0.5 text-xs text-slate-400">{lang === 'zh' ? '按每日骑行里程显示' : 'Daily riding distance'}</p></div><div className="flex items-center gap-2"><button onClick={() => setWeek(current => new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">‹</button><span className="min-w-32 text-center text-xs font-semibold text-slate-700">{range}</span><button onClick={() => setWeek(current => new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">›</button></div></div><div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">{days.map((day, index) => <div key={day.key} title={`${day.key}: ${day.km.toFixed(1)} km`} className={`rounded-xl border p-2 text-center ${color(day.km)}`}><p className="text-[10px] font-medium opacity-80">{labels[index]}</p><p className="mt-1 text-sm font-bold">{day.date.getDate()}</p><p className="mt-1 text-[10px] font-medium">{day.km ? `${day.km.toFixed(1)} km` : '—'}</p></div>)}</div></section>
}
