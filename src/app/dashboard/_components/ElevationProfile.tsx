'use client'

import { Mountain } from 'lucide-react'
import type { Ride } from '../_lib/utils'
import { useLanguage } from '../../../components/LanguageProvider'

export function ElevationProfile({ ride }: { ride: Ride }) {
  const { lang } = useLanguage()
  const points = ride.elevation_profile?.length ? ride.elevation_profile : Array.from({ length: 18 }, (_, index) => 16 + Math.sin(index * 0.7 + ride.distance / 10000) * 8 + index * 0.65)
  const min = Math.min(...points), max = Math.max(...points), range = Math.max(1, max - min)
  const path = points.map((point, index) => `${(index / (points.length - 1)) * 100},${88 - ((point - min) / range) * 62}`).join(' ')
  const gain = ride.total_elevation_gain ?? Math.max(8, Math.round((ride.distance / 1000) * 3.2))
  return <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5"><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Mountain className="h-3.5 w-3.5 text-emerald-600" />{lang === 'zh' ? '海拔起伏' : 'Elevation profile'}</span><span className="text-[11px] font-semibold text-emerald-700">+{Math.round(gain)} m</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-20 w-full overflow-visible" aria-label={lang === 'zh' ? '海拔起伏图' : 'Elevation profile chart'}><defs><linearGradient id="elevation" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#34d399" stopOpacity=".55" /><stop offset="1" stopColor="#34d399" stopOpacity=".04" /></linearGradient></defs><polygon points={`0,100 ${path} 100,100`} fill="url(#elevation)" /><polyline points={path} fill="none" stroke="#059669" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg><p className="mt-1 text-[10px] text-slate-400">{ride.elevation_profile?.length ? (lang === 'zh' ? '来自 Strava 的海拔数据' : 'From Strava elevation data') : (lang === 'zh' ? '历史骑行的估算起伏；重新同步后将显示实测数据。' : 'Estimated for older rides; re-sync to load Strava data.')}</p></section>
}
