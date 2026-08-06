'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'
import { dashboardCardClass, dashboardCardTitleClass, dashboardCollapseButtonClass, moduleText } from '../_lib/module-ui'

type Advice = { temperature: number; windSpeed: number; windDirection: number; raining: boolean; rainProbability: number; sunset: string; aqi: number }
const direction = (degree: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degree / 45) % 8]

export function RideAdviceCard() {
  const { lang, t } = useLanguage()
  const ui = moduleText(lang)
  const [data, setData] = useState<Advice | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true); setFailed(false)
    try {
      const response = await fetch('/api/ride-advice')
      if (!response.ok) throw new Error('Weather request failed')
      setData(await response.json())
    } catch { setData(null); setFailed(true) } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  if (!data && loading) return <section className={`${dashboardCardClass} animate-pulse`}><div className="h-5 w-36 rounded bg-slate-100" /><div className="mt-3 h-4 w-2/3 rounded bg-slate-100" /></section>
  if (!data && failed) return <section className={`${dashboardCardClass} border-amber-100 bg-amber-50`}><p className="text-sm font-medium text-amber-800">{ui.weatherUnavailable}</p><button onClick={() => void load()} className="mt-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100">{ui.retry}</button></section>
  if (!data) return null

  const poorAir = data.aqi > 60
  const bad = data.raining || data.rainProbability >= 65 || data.windSpeed >= 35 || poorAir
  const cautious = data.rainProbability >= 35 || data.windSpeed >= 22 || data.aqi > 40
  const verdict = bad ? ui.notRecommended : cautious ? ui.consider : ui.recommended
  const reason = bad
    ? lang === 'zh' ? (data.raining || data.rainProbability >= 65 ? '降雨风险较高，今天更适合选择其他出行方式。' : data.windSpeed >= 35 ? '风力较强，骑行舒适度与安全性会受影响。' : '空气质量一般，建议减少长时间户外骑行。') : 'Conditions are less suitable for cycling today.'
    : cautious ? lang === 'zh' ? `无明显降雨，但有${data.windSpeed >= 22 ? '较强风力' : '轻微天气因素'}，请按体感决定。` : 'No major rain, but conditions need a little care.'
    : lang === 'zh' ? `无降雨，${data.windSpeed < 15 ? '风力轻微' : '风力适中'}，空气质量良好。` : 'No rain, manageable wind and good air quality.'
  const sunset = new Date(data.sunset).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  const airText = data.aqi <= 20 ? ui.excellent : data.aqi <= 40 ? ui.good : data.aqi <= 60 ? ui.moderate : ui.poor

  return <section className={dashboardCardClass}>
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-2"><button onClick={() => setCollapsed(value => !value)} title={collapsed ? t.expand : t.collapse} className={`${dashboardCollapseButtonClass} mt-0.5`}>{collapsed ? '+' : '-'}</button><div><p className="text-xs font-medium text-slate-400">{ui.todayAdvice}</p>{!collapsed && <><h2 className={`mt-1 ${dashboardCardTitleClass} ${bad ? 'text-rose-600' : cautious ? 'text-amber-600' : 'text-emerald-600'}`}>{verdict}</h2><p className="mt-1 text-sm text-slate-600">{reason}</p></>}</div></div>{!collapsed && <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xl">☀️</span>}</div>
    {!collapsed && <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5"><Metric emoji="🌧️" label={ui.rain} value={`${data.rainProbability}%`} /><Metric emoji="💨" label={ui.wind} value={`${direction(data.windDirection)} ${Math.round(data.windSpeed)} km/h`} /><Metric emoji="🌡️" label={ui.temperature} value={`${Math.round(data.temperature)}°C`} /><Metric emoji="🌇" label={ui.sunset} value={sunset} /><Metric emoji="🌿" label={ui.air} value={airText} /></div>}
  </section>
}

function Metric({ emoji, label, value }: { emoji: string; label: string; value: string }) { return <span className="rounded-lg bg-slate-50 p-2 text-slate-600">{emoji} {label}<b className="mt-1 block text-slate-800">{value}</b></span> }
