'use client'

import { useEffect, useState } from 'react'
import { Award, CheckCircle2, LockKeyhole, Trophy } from 'lucide-react'
import type { Lang } from '../dashboard/_lib/i18n'
import { supabase } from '../../lib/supabase'
import { demoRides } from '../demo/mock-data'
import { calculateROI, type Ride } from '../dashboard/_lib/utils'
import type { TfLFareSettings } from '../../lib/tfl/fares'

interface AchievementPanelProps {
  lang: Lang
  settings: TfLFareSettings
}

type Achievement = {
  id: string
  title: Record<Lang, string>
  description: Record<Lang, string>
  progress: number
  target: number
  valueLabel: string
  icon: string
}

export function AchievementPanel({ lang, settings }: AchievementPanelProps) {
  const [rides, setRides] = useState<Ride[]>(demoRides)
  const [bikePrice, setBikePrice] = useState('0')

  useEffect(() => {
    const loadAchievements = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const [{ data: saved }, { data: savedRides }] = await Promise.all([
        supabase.from('settings').select('bike_price').eq('id', session.user.id).maybeSingle(),
        supabase.from('rides').select('*').eq('user_id', session.user.id),
      ])
      if (saved?.bike_price != null) setBikePrice(String(saved.bike_price))
      if (savedRides) setRides(savedRides as Ride[])
    }
    void loadAchievements()
  }, [])

  const totalDistanceKm = rides.reduce((sum, ride) => sum + (Number(ride.distance) || 0), 0) / 1000
  const roi = calculateROI(rides, bikePrice, settings, lang)
  const totalRides = rides.length
  const totalSavings = Number(roi.estimatedSavings)
  const isFullyPaidBack = roi.isFullyPaidBack
  const achievements: Achievement[] = [
    { id: 'first-ride', title: { en: 'Getting started', zh: '启航骑手' }, description: { en: 'Ride your first 50 km', zh: '累计骑行 50 公里' }, progress: totalDistanceKm, target: 50, valueLabel: `${totalDistanceKm.toFixed(1)} / 50 km`, icon: '🚴' },
    { id: 'explorer', title: { en: '100 km Explorer', zh: '百里骑侠' }, description: { en: 'Reach 100 km', zh: '累计骑行 100 公里' }, progress: totalDistanceKm, target: 100, valueLabel: `${totalDistanceKm.toFixed(1)} / 100 km`, icon: '🗺️' },
    { id: 'city-rider', title: { en: 'City rider', zh: '城市骑行者' }, description: { en: 'Reach 250 km', zh: '累计骑行 250 公里' }, progress: totalDistanceKm, target: 250, valueLabel: `${totalDistanceKm.toFixed(1)} / 250 km`, icon: '🌆' },
    { id: 'long-distance', title: { en: 'Long-distance rider', zh: '长途骑行者' }, description: { en: 'Reach 500 km', zh: '累计骑行 500 公里' }, progress: totalDistanceKm, target: 500, valueLabel: `${totalDistanceKm.toFixed(1)} / 500 km`, icon: '🏁' },
    { id: 'thousand-club', title: { en: '1,000 km club', zh: '千里俱乐部' }, description: { en: 'Reach 1,000 km', zh: '累计骑行 1,000 公里' }, progress: totalDistanceKm, target: 1000, valueLabel: `${totalDistanceKm.toFixed(1)} / 1,000 km`, icon: '🏆' },
    { id: 'regular-rider', title: { en: 'Regular rider', zh: '坚持骑行' }, description: { en: 'Complete 25 rides', zh: '完成 25 次骑行' }, progress: totalRides, target: 25, valueLabel: `${totalRides} / 25`, icon: '✨' },
    { id: 'savings-pioneer', title: { en: 'Savings pioneer', zh: '省钱先锋' }, description: { en: 'Save £50 through cycling', zh: '骑行节省 £50' }, progress: totalSavings, target: 50, valueLabel: `£${totalSavings.toFixed(2)} / £50`, icon: '💷' },
    { id: 'paid-back', title: { en: 'Fully paid back', zh: '车辆回本' }, description: { en: 'Recover your bike cost', zh: '骑行节省覆盖自行车成本' }, progress: isFullyPaidBack ? 1 : 0, target: 1, valueLabel: isFullyPaidBack ? (lang === 'zh' ? '已完成' : 'Complete') : (lang === 'zh' ? '进行中' : 'In progress'), icon: '🎉' },
  ]
  const unlocked = achievements.filter(item => item.progress >= item.target).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
        <span className="flex items-center gap-2 text-sm font-bold text-amber-900"><Trophy className="h-4 w-4" />{lang === 'zh' ? '已解锁成就' : 'Unlocked achievements'}</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-amber-800">{unlocked} / {achievements.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {achievements.map(item => {
          const isUnlocked = item.progress >= item.target
          const percentage = Math.min(100, Math.round((item.progress / item.target) * 100))
          return <article key={item.id} className={`rounded-xl border p-3 ${isUnlocked ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50/60'}`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${isUnlocked ? 'bg-white shadow-sm' : 'bg-slate-200/70 grayscale'}`}>{item.icon}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-800">{item.title[lang]}</h3><p className="mt-0.5 text-xs text-slate-500">{item.description[lang]}</p></div>{isUnlocked ? <CheckCircle2 aria-label={lang === 'zh' ? '已完成' : 'Completed'} className="h-4 w-4 shrink-0 text-emerald-600" /> : <LockKeyhole aria-label={lang === 'zh' ? '未完成' : 'Not completed'} className="h-3.5 w-3.5 shrink-0 text-slate-400" />}</div><div className="mt-3 flex items-center gap-2"><div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${isUnlocked ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${percentage}%` }} /></div><span className="shrink-0 text-[11px] font-bold text-slate-600">{item.valueLabel}</span></div></div></div></article>
        })}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><Award className="h-3.5 w-3.5 text-amber-500" />{lang === 'zh' ? '成就会根据你已同步的骑行记录自动更新。' : 'Achievements update automatically from your synced rides.'}</p>
    </div>
  )
}
