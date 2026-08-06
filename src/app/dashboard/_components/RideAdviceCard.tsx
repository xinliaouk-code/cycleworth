'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '../../../components/LanguageProvider'

type Advice = { temperature: number; windSpeed: number; windDirection: number; raining: boolean; rainProbability: number; sunset: string; aqi: number }
const direction = (degree: number) => ['N','NE','E','SE','S','SW','W','NW'][Math.round(degree / 45) % 8]

export function RideAdviceCard() {
  const { lang } = useLanguage(); const [data, setData] = useState<Advice | null>(null); const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { fetch('/api/ride-advice').then(response => response.ok ? response.json() : null).then(setData).catch(() => setData(null)) }, [])
  if (!data) return null
  const poorAir = data.aqi > 60; const bad = data.raining || data.rainProbability >= 65 || data.windSpeed >= 35 || poorAir
  const cautious = data.rainProbability >= 35 || data.windSpeed >= 22 || data.aqi > 40
  const verdict = bad ? (lang === 'zh' ? '不建议骑车' : 'Not recommended') : cautious ? (lang === 'zh' ? '可考虑骑车' : 'Consider cycling') : (lang === 'zh' ? '推荐骑车' : 'Recommended')
  const reason = bad ? (lang === 'zh' ? (data.raining || data.rainProbability >= 65 ? '降雨风险较高，今天更适合选择其他出行方式。' : data.windSpeed >= 35 ? '风力较强，骑行舒适度与安全性会受影响。' : '空气质量一般，建议减少长时间户外骑行。') : 'Conditions are less suitable for cycling today.') : cautious ? (lang === 'zh' ? `无明显降雨，但有${data.windSpeed >= 22 ? '较强风力' : '轻微天气因素'}，请按体感决定。` : 'No major rain, but conditions need a little care.') : (lang === 'zh' ? `无降雨，${data.windSpeed < 15 ? '风力轻微' : '风力适中'}，空气质量良好。` : 'No rain, manageable wind and good air quality.')
  const sunset = new Date(data.sunset).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  const airText = data.aqi <= 20 ? (lang === 'zh' ? '优' : 'Excellent') : data.aqi <= 40 ? (lang === 'zh' ? '良好' : 'Good') : data.aqi <= 60 ? (lang === 'zh' ? '一般' : 'Moderate') : (lang === 'zh' ? '较差' : 'Poor')
  return <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2"><button onClick={() => setCollapsed(value => !value)} className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{collapsed ? '+' : '−'}</button><div><p className="text-xs font-medium text-slate-400">{lang === 'zh' ? '今日骑行建议' : 'Today’s ride advice'}</p>{!collapsed && <><h2 className={`mt-1 text-lg font-bold ${bad ? 'text-rose-600' : cautious ? 'text-amber-600' : 'text-emerald-600'}`}>{verdict}</h2><p className="mt-1 text-sm text-slate-600">{reason}</p></>}</div></div>{!collapsed && <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xl">🚲</span>}</div>{!collapsed && <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5"><span className="rounded-lg bg-slate-50 p-2 text-slate-600">🌧️ {lang === 'zh' ? '降雨' : 'Rain'}<b className="mt-1 block text-slate-800">{data.rainProbability}%</b></span><span className="rounded-lg bg-slate-50 p-2 text-slate-600">💨 {lang === 'zh' ? '风' : 'Wind'}<b className="mt-1 block text-slate-800">{direction(data.windDirection)} {Math.round(data.windSpeed)} km/h</b></span><span className="rounded-lg bg-slate-50 p-2 text-slate-600">🌡️ {lang === 'zh' ? '温度' : 'Temp'}<b className="mt-1 block text-slate-800">{Math.round(data.temperature)}°C</b></span><span className="rounded-lg bg-slate-50 p-2 text-slate-600">🌇 {lang === 'zh' ? '日落' : 'Sunset'}<b className="mt-1 block text-slate-800">{sunset}</b></span><span className="rounded-lg bg-slate-50 p-2 text-slate-600">🍃 {lang === 'zh' ? '空气' : 'Air'}<b className="mt-1 block text-slate-800">{airText}</b></span></div>}</section>
}
