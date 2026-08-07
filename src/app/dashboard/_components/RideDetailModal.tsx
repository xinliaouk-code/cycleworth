'use client'

import dynamic from 'next/dynamic'
import type { Ride } from '../_lib/utils'
import { formatDateCN } from '../_lib/utils'
import { useLanguage } from '../../../components/LanguageProvider'

const RideMap = dynamic<{ polyline: string }>(() => import('../../../components/RideMap'), { ssr: false })

export function RideDetailModal({ ride, onClose }: { ride: Ride; onClose: () => void }) {
  const { lang } = useLanguage()
  const text = lang === 'zh' ? { title: '骑行路线详情', start: '起点', end: '终点', unknown: '未知', minutes: '分钟' } : { title: 'Ride details', start: 'Start', end: 'End', unknown: 'Unknown', minutes: 'min' }
  return <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm md:items-center md:p-4"><div onClick={event => event.stopPropagation()} className="w-full space-y-4 rounded-t-3xl border border-slate-100 bg-white p-5 shadow-2xl md:w-[560px] md:rounded-2xl md:p-6"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-lg font-bold text-slate-800">{ride.name || text.title}</h2><p className="mt-1 text-xs text-slate-400">{formatDateCN(ride.start_date, lang)}</p><p className="mt-1 text-xs text-slate-600">{(ride.distance / 1000).toFixed(1)} km · {Math.round(ride.moving_time / 60)} {text.minutes} · {Math.round(Number(ride.calories) || 0).toLocaleString()} kcal</p></div><button onClick={onClose} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500">×</button></div><div className="h-64 w-full overflow-hidden rounded-2xl"><RideMap polyline={ride.summary_polyline} /></div><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"><div className="min-w-0"><span className="block text-[10px] text-slate-400">{text.start}</span><span className="block truncate font-semibold text-slate-700">{ride.start_station || text.unknown}</span></div><span className="font-bold text-slate-300">→</span><div className="min-w-0 text-right"><span className="block text-[10px] text-slate-400">{text.end}</span><span className="block truncate font-semibold text-slate-700">{ride.end_station || text.unknown}</span></div></div></div></div>
}
