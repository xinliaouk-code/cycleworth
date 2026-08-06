'use client'

import { useMemo, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import type { Ride } from '../_lib/utils'

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const dayLabelsZh = ['一', '二', '三', '四', '五', '六', '日']

export function RideHeatmap({ rides }: { rides: Ride[] }) {
  const { lang } = useLanguage()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const values = useMemo(() => {
    const map = new Map<string, number>()
    rides.forEach(ride => {
      const key = ride.start_date?.slice(0, 10)
      if (key) map.set(key, (map.get(key) ?? 0) + (Number(ride.distance) || 0) / 1000)
    })
    return map
  }, [rides])
  const year = month.getFullYear(); const monthIndex = month.getMonth()
  const first = new Date(year, monthIndex, 1); const days = new Date(year, monthIndex + 1, 0).getDate()
  const offset = (first.getDay() + 6) % 7
  const max = Math.max(1, ...Array.from({ length: days }, (_, index) => values.get(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`) ?? 0))
  const title = month.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', { year: 'numeric', month: 'long' })
  const labels = lang === 'zh' ? dayLabelsZh : dayLabels
  const intensity = (km: number) => km === 0 ? 'bg-slate-50' : km / max < .25 ? 'bg-emerald-100' : km / max < .5 ? 'bg-emerald-300' : km / max < .75 ? 'bg-emerald-500' : 'bg-emerald-700'
  return <section className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm md:p-6"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-slate-800 md:text-lg">{lang === 'zh' ? '骑行日历' : 'Ride calendar'}</h2><p className="mt-0.5 text-xs text-slate-400">{lang === 'zh' ? '颜色越深，骑行里程越多' : 'Darker days mean more distance'}</p></div><div className="flex items-center gap-2"><button onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">‹</button><span className="min-w-24 text-center text-sm font-semibold text-slate-700">{title}</span><button onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">›</button></div></div><div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">{labels.map(label => <span key={label} className="text-center text-[10px] text-slate-400">{label}</span>)}{Array.from({ length: offset }).map((_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => { const day = index + 1; const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const km = values.get(key) ?? 0; return <div key={key} title={`${key}: ${km.toFixed(1)} km`} className={`aspect-square rounded-md transition ${intensity(km)}`}><span className="flex h-full items-center justify-center text-[10px] font-medium text-slate-500">{day}</span></div> })}</div></section>
}
