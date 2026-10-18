'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import {
  CloudRain,
  Wind,
  Thermometer,
  Sunset,
  Leaf,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useLanguage } from '../../../components/LanguageProvider'
import { dashboardCardClass, dashboardCollapseButtonClass, moduleText } from '../_lib/module-ui'

type Advice = {
  temperature: number
  windSpeed: number
  windDirection: number
  raining: boolean
  rainProbability: number
  sunset: string
  aqi: number
}

const direction = (degree: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degree / 45) % 8]

export function RideAdviceCard({ initialData }: { initialData?: Advice } = {}) {
  const { lang, t } = useLanguage()
  const ui = moduleText(lang)
  const detailsId = useId()
  const [data, setData] = useState<Advice | null>(initialData ?? null)
  const [collapsed, setCollapsed] = useState(false)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(!initialData)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const response = await fetch('/api/ride-advice')
      if (response.ok) {
        const json = await response.json()
        if (json && !json.error) {
          setData(json)
          return
        }
      }
      // Fallback
      setData({
        temperature: 18,
        windSpeed: 12,
        windDirection: 225,
        raining: false,
        rainProbability: 10,
        sunset: new Date().toISOString(),
        aqi: 18
      })
    } catch {
      setData({
        temperature: 18,
        windSpeed: 12,
        windDirection: 225,
        raining: false,
        rainProbability: 10,
        sunset: new Date().toISOString(),
        aqi: 18
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialData) return
    const timeoutId = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [initialData, load])

  if (!data && loading) {
    return (
      <section className={`${dashboardCardClass} animate-pulse`}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-slate-100" />
          <div className="h-5 w-36 rounded-lg bg-slate-100" />
        </div>
        <div className="mt-4 h-12 w-full rounded-xl bg-slate-100" />
      </section>
    )
  }

  if (!data && failed) {
    return (
      <section className={`${dashboardCardClass} border-amber-200/80 bg-amber-50/60`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-amber-900">{ui.weatherUnavailable}</p>
          <button
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-amber-800 shadow-xs transition hover:bg-amber-100 active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {ui.retry}
          </button>
        </div>
      </section>
    )
  }

  if (!data) return null

  const poorAir = data.aqi > 60
  const bad = data.raining || data.rainProbability >= 65 || data.windSpeed >= 35 || poorAir
  const cautious = data.rainProbability >= 35 || data.windSpeed >= 22 || data.aqi > 40
  const verdict = bad ? ui.notRecommended : cautious ? ui.consider : ui.recommended

  const reason = bad
    ? data.raining || data.rainProbability >= 65
      ? (lang === 'zh' ? '降雨概率较高，建议换一种出行方式。' : 'Rain likely. Consider another way to travel.')
      : data.windSpeed >= 35
        ? (lang === 'zh' ? '大风天气，建议减少骑行。' : 'Strong winds. Consider skipping the ride.')
        : (lang === 'zh' ? '空气质量较差，建议减少户外骑行。' : 'Poor air quality. Limit outdoor riding.')
    : cautious
      ? data.windSpeed >= 22
        ? (lang === 'zh' ? '风力偏强，注意侧风。' : 'Breezy conditions. Watch for crosswinds.')
        : data.aqi > 40
          ? (lang === 'zh' ? '空气一般，按体感安排骑行。' : 'Moderate air quality. Adjust your ride.')
          : (lang === 'zh' ? '可能有雨，出门前再看天气。' : 'Rain possible. Check before heading out.')
      : (lang === 'zh' ? '天气适合骑行，按体感增减衣物。' : 'Good riding conditions. Dress for comfort.')

  const sunset = new Date(data.sunset).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const airText = data.aqi <= 20 ? ui.excellent : data.aqi <= 40 ? ui.good : data.aqi <= 60 ? ui.moderate : ui.poor

  const cardTheme = bad
    ? {
        bg: 'bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30 border-rose-200/80',
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        title: 'text-rose-700',
        icon: XCircle,
      }
    : cautious
      ? {
          bg: 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-200/80',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          title: 'text-amber-700',
          icon: AlertTriangle,
        }
      : {
          bg: 'bg-gradient-to-br from-emerald-200/80 via-emerald-50/85 to-sky-100/70 border-emerald-300/90 shadow-[0_12px_30px_-20px_rgba(5,150,105,0.7)]',
          badge: 'bg-emerald-600 text-white border-emerald-700 shadow-sm',
          title: 'text-emerald-700',
          icon: CheckCircle2,
        }

  const statusLabel = lang === 'zh' ? verdict : bad ? 'Avoid today' : cautious ? 'Take care' : 'Good to ride'
  const StatusIcon = cardTheme.icon
  const gear = [
    data.temperature < 15 ? (lang === 'zh' ? '防风长袖' : 'Long sleeves') : (lang === 'zh' ? '短袖' : 'Short sleeves'),
    ...(data.rainProbability > 30 || data.raining ? [lang === 'zh' ? '雨衣' : 'Raincoat'] : []),
    lang === 'zh' ? '骑行眼镜' : 'Glasses',
    lang === 'zh' ? '头盔/车灯' : 'Helmet + lights',
  ]

  return (
    <section aria-label={ui.todayAdvice} className={`${dashboardCardClass} ${cardTheme.bg}`}>
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 text-xs font-semibold text-slate-600 md:text-sm">
          {lang === 'zh' ? ui.todayAdvice : 'Ride advice'}
        </h2>
        <span title={verdict} aria-label={verdict} className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-bold ${cardTheme.badge}`}>
          <StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(value => !value)}
          aria-label={collapsed ? t.expand : t.collapse}
          aria-expanded={!collapsed}
          aria-controls={detailsId}
          className={`${dashboardCollapseButtonClass} h-11! w-11! -mr-1`}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div id={detailsId}>
          <p className="mt-1 text-xs leading-5 text-slate-600">{reason}</p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <Metric icon={Thermometer} label={ui.temperature} value={`${Math.round(data.temperature)}°C`} iconColor="text-amber-500" />
            <Metric icon={CloudRain} label={ui.rain} value={`${data.rainProbability}%`} iconColor="text-sky-500" />
            <Metric icon={Wind} label={`${ui.wind} ${direction(data.windDirection)}`} value={`${Math.round(data.windSpeed)} km/h`} iconColor="text-teal-500" />
          </div>
          <div className="mt-2.5 flex items-center gap-5 text-[11px] leading-5 text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Sunset className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />{ui.sunset}<b className="font-semibold text-slate-700">{sunset}</b></span>
            <span className="inline-flex items-center gap-1.5"><Leaf className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />{ui.air}<b className="font-semibold text-slate-700">{airText}</b></span>
          </div>
          <p className="mt-2.5 border-t border-slate-200/50 pt-2 text-[11px] leading-5 text-slate-600">
            <span className="mr-2 font-semibold text-slate-500">{lang === 'zh' ? '装备' : 'Gear'}</span>
            {gear.join(' · ')}
          </p>
        </div>
      )}
    </section>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  iconColor: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-100 bg-white/85 px-2 py-2.5">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} aria-hidden="true" />
      <div className="min-w-0">
        <span className="block text-[10px] leading-4 text-slate-500">{label}</span>
        <b className="block whitespace-nowrap text-xs font-bold leading-4 text-slate-800">{value}</b>
      </div>
    </div>
  )
}
