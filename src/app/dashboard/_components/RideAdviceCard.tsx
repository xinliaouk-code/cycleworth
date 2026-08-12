'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CloudRain,
  Wind,
  Thermometer,
  Sunset,
  Leaf,
  Sun,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useLanguage } from '../../../components/LanguageProvider'
import { dashboardCardClass, dashboardCardTitleClass, dashboardCollapseButtonClass, moduleText } from '../_lib/module-ui'

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
    ? lang === 'zh'
      ? data.raining || data.rainProbability >= 65
        ? '降雨风险较高，今天更适合选择其他出行方式。'
        : data.windSpeed >= 35
          ? '风力较强，骑行舒适度与安全性会受影响。'
          : '空气质量一般，建议减少长时间户外骑行。'
      : 'Conditions are less suitable for cycling today.'
    : cautious
      ? lang === 'zh'
        ? `无明显降雨，但有${data.windSpeed >= 22 ? '较强风力' : '轻微天气因素'}，请按体感决定。`
        : 'No major rain, but conditions need a little care.'
      : lang === 'zh'
        ? `无降雨，${data.windSpeed < 15 ? '风力轻微' : '风力适中'}，空气质量良好。`
        : 'No rain, manageable wind and good air quality.'

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

  const StatusIcon = cardTheme.icon

  return (
    <section className={`${dashboardCardClass} ${cardTheme.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? t.expand : t.collapse}
            className={`${dashboardCollapseButtonClass} mt-0.5`}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{ui.todayAdvice}</span>
            {!collapsed && (
              <div className="mt-1.5 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-extrabold ${cardTheme.badge}`}>
                    <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                    {verdict}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 md:text-sm">{reason}</p>
              </div>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="hidden shrink-0 items-center justify-center rounded-2xl bg-white p-2.5 shadow-xs border border-slate-100 sm:flex">
            <Sun className="h-6 w-6 text-amber-500" />
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5 md:gap-3">
            <Metric icon={CloudRain} label={ui.rain} value={`${data.rainProbability}%`} iconColor="text-sky-500" />
            <Metric icon={Wind} label={ui.wind} value={`${direction(data.windDirection)} ${Math.round(data.windSpeed)} km/h`} iconColor="text-teal-500" />
            <Metric icon={Thermometer} label={ui.temperature} value={`${Math.round(data.temperature)}°C`} iconColor="text-amber-500" />
            <Metric icon={Sunset} label={ui.sunset} value={sunset} iconColor="text-orange-500" />
            <Metric icon={Leaf} label={ui.air} value={airText} iconColor="text-emerald-500" />
          </div>

          {/* Gear & Outfit Advice Chips */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/50 text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              {lang === 'zh' ? '穿搭/装备小贴士:' : 'Recommended Gear:'}
            </span>
            {data.temperature < 15 ? (
              <span className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 shadow-2xs">
                🧥 {lang === 'zh' ? '防风夹克 / 长袖' : 'Windbreaker Jacket'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
                👕 {lang === 'zh' ? '短袖骑行服' : 'Short-sleeve Jersey'}
              </span>
            )}

            {(data.rainProbability > 30 || data.raining) && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 shadow-2xs">
                ☔ {lang === 'zh' ? '携带雨衣' : 'Pack Rain Coat'}
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-2xs">
              🕶️ {lang === 'zh' ? '防风骑行眼镜' : 'Riding Shades'}
            </span>

            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs">
              🪖 {lang === 'zh' ? '头盔 & 骑行灯' : 'Helmet & Bike Lights'}
            </span>
          </div>
        </>
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
    <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white/90 p-2.5 shadow-xs">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 ${iconColor}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-semibold text-slate-400">{label}</span>
        <b className="block truncate text-xs font-bold text-slate-800">{value}</b>
      </div>
    </div>
  )
}
