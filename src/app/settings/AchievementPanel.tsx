'use client'

import { useEffect, useMemo, useState } from 'react'
import { Award, CheckCircle2, LockKeyhole, Trophy } from 'lucide-react'
import type { Lang } from '../dashboard/_lib/i18n'
import { supabase } from '../../lib/supabase'
import { demoRides } from '../demo/mock-data'
import { calculateROI, type Ride } from '../dashboard/_lib/utils'
import type { TfLFareSettings } from '../../lib/tfl/fares'

type Achievement = { id: string; icon: string; title: Record<Lang, string>; description: Record<Lang, string>; progress: number; target: number; valueLabel: string }

export function AchievementPanel({ lang, settings }: { lang: Lang; settings: TfLFareSettings }) {
  const [rides, setRides] = useState<Ride[]>(demoRides)
  const [bikePrice, setBikePrice] = useState('0')

  useEffect(() => { const load = async () => { const { data: { session } } = await supabase.auth.getSession(); if (!session?.user) return; const [{ data: saved }, { data: savedRides }] = await Promise.all([supabase.from('settings').select('bike_price').eq('id', session.user.id).maybeSingle(), supabase.from('rides').select('*').eq('user_id', session.user.id)]); if (saved?.bike_price != null) setBikePrice(String(saved.bike_price)); if (savedRides) setRides(savedRides as Ride[]) }; void load() }, [])

  const achievements = useMemo<Achievement[]>(() => {
    const distance = rides.reduce((sum, ride) => sum + (Number(ride.distance) || 0), 0) / 1000
    const count = rides.length
    const savings = Number(calculateROI(rides, bikePrice, settings, lang).estimatedSavings)
    const roi = calculateROI(rides, bikePrice, settings, lang).roiPercentageNum
    const topSpeed = Math.max(0, ...rides.map(ride => (ride.max_speed ?? ride.average_speed ?? ((ride.distance / 1000) / (ride.moving_time / 3600) / 3.6)) * 3.6))
    const elevation = rides.reduce((sum, ride) => sum + Number(ride.total_elevation_gain ?? (ride.distance / 1000) * 3.2), 0)
    const calories = rides.reduce((sum, ride) => sum + Number(ride.calories || 0), 0)
    const longestRide = Math.max(0, ...rides.map(ride => ride.distance / 1000))
    const make = (id: string, icon: string, title: string, titleZh: string, description: string, descriptionZh: string, progress: number, target: number, unit: string) => ({ id, icon, title: { en: title, zh: titleZh }, description: { en: description, zh: descriptionZh }, progress, target, valueLabel: `${progress.toFixed(unit === 'rides' ? 0 : 1)} / ${target}${unit === 'rides' ? '' : ` ${unit}`}` })
    return [
      ...[50, 100, 250, 500, 1000, 2500].map(target => make(`distance-${target}`, '🚴', `${target} km rider`, `${target} 公里骑手`, `Ride ${target} km in total`, `累计骑行 ${target} 公里`, distance, target, 'km')),
      ...[1, 10, 25, 50, 100].map(target => make(`rides-${target}`, '✨', `${target} rides`, `完成 ${target} 次骑行`, `Complete ${target} rides`, `完成 ${target} 次骑行`, count, target, 'rides')),
      ...[10, 50, 100, 250].map(target => make(`savings-${target}`, '💷', `£${target} saved`, `节省 £${target}`, `Save £${target} by cycling`, `骑行节省 £${target}`, savings, target, '£')),
      ...[15, 20, 25, 30].map(target => make(`speed-${target}`, '⚡', `${target} km/h peak`, `极速 ${target} km/h`, `Record a ${target} km/h top speed`, `最高速度达到 ${target} km/h`, topSpeed, target, 'km/h')),
      ...[100, 500, 1000, 2500].map(target => make(`climb-${target}`, '⛰️', `${target} m climbed`, `累计爬升 ${target} 米`, `Climb ${target} m in total`, `累计爬升 ${target} 米`, elevation, target, 'm')),
      ...[1000, 5000, 10000].map(target => make(`energy-${target}`, '🔥', `${target} kcal burned`, `消耗 ${target} 千卡`, `Burn ${target} kcal`, `累计消耗 ${target} 千卡`, calories, target, 'kcal')),
      ...[50, 100].map(target => make(`roi-${target}`, '🎉', `${target}% paid back`, `回本 ${target}%`, `Reach ${target}% bike payback`, `自行车成本回收 ${target}%`, roi, target, '%')),
      ...[10, 25].map(target => make(`longest-${target}`, '🏁', `${target} km single ride`, `单次 ${target} 公里`, `Finish one ${target} km ride`, `单次骑行达到 ${target} 公里`, longestRide, target, 'km')),
    ]
  }, [bikePrice, lang, rides, settings])
  const unlocked = achievements.filter(item => item.progress >= item.target).length

  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/70 p-3"><span className="flex items-center gap-2 text-sm font-bold text-amber-900"><Trophy className="h-4 w-4" />{lang === 'zh' ? '已解锁成就' : 'Unlocked achievements'}</span><span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-amber-800">{unlocked} / {achievements.length}</span></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{achievements.map(item => { const unlocked = item.progress >= item.target; const percentage = Math.min(100, Math.round((item.progress / item.target) * 100)); return <article key={item.id} className={`rounded-xl border p-3 ${unlocked ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50/60'}`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${unlocked ? 'bg-white shadow-sm' : 'bg-slate-200/70 grayscale'}`}>{item.icon}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-800">{item.title[lang]}</h3><p className="mt-0.5 text-xs text-slate-500">{item.description[lang]}</p></div>{unlocked ? <CheckCircle2 aria-label={lang === 'zh' ? '已完成' : 'Completed'} className="h-4 w-4 shrink-0 text-emerald-600" /> : <LockKeyhole aria-label={lang === 'zh' ? '未完成' : 'Not completed'} className="h-3.5 w-3.5 shrink-0 text-slate-400" />}</div><div className="mt-3 flex items-center gap-2"><div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${unlocked ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${percentage}%` }} /></div><span className="shrink-0 text-[11px] font-bold text-slate-600">{item.valueLabel}</span></div></div></div></article> })}</div><p className="flex items-center gap-1.5 text-xs text-slate-500"><Award className="h-3.5 w-3.5 text-amber-500" />{lang === 'zh' ? '成就会根据已同步的骑行数据自动更新。' : 'Achievements update automatically from synced rides.'}</p></div>
}
