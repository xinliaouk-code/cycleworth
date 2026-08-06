'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase'

// Components
import { StatsGrid } from './_components/StatsGrid'
import { BikeROICard } from './_components/BikeROICard'
import { SettingsPanel } from './_components/SettingsPanel'
import { SyncStatus } from './_components/SyncStatus'
import { WeeklyChart } from './_components/WeeklyChart'
import { RideList } from './_components/RideList'
import { MaintenanceCard } from './_components/MaintenanceCard'
import { RideHeatmap } from './_components/RideHeatmap'
import { RideAdviceCard } from './_components/RideAdviceCard'

// Utils & Types
import { Ride, formatDateCN, calculateROI, prepareChartData } from './_lib/utils'
import { LanguageSwitcher, useLanguage } from '../../components/LanguageProvider'
import { DEFAULT_TFL_FARE_SETTINGS, parseTfLFareSettings } from '../../lib/tfl/fares'
import { DEFAULT_DASHBOARD_LAYOUT, parseDashboardLayout } from '../../lib/dashboard-layout'

const RideMap = dynamic<{ polyline: string }>(
  () => import('../../components/RideMap'), 
  { ssr: false }
)

// 读取本地缓存的多站点/购车设置，作为 useState 的惰性初始值。
// 放在组件外：只在首次渲染求值一次，避免在 effect 里同步 setState
// （react-hooks/set-state-in-effect），也让授权回跳后的首次同步即用到
// 用户已保存的站点设置。
function loadCommuteSettings() {
  const fallback = {
    homeStation: 'Custom House, Royal Victoria',
    officeStation: 'Bank, Old Street',
    morningStart: '7',
    morningEnd: '10',
    eveningStart: '16',
    eveningEnd: '20'
  }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem('cw_commute_settings')
    if (!raw) return fallback
    const p = JSON.parse(raw)
    return {
      homeStation: p.homeStation ?? fallback.homeStation,
      officeStation: p.officeStation ?? fallback.officeStation,
      morningStart: p.morningStart ?? fallback.morningStart,
      morningEnd: p.morningEnd ?? fallback.morningEnd,
      eveningStart: p.eveningStart ?? fallback.eveningStart,
      eveningEnd: p.eveningEnd ?? fallback.eveningEnd
    }
  } catch {
    return fallback
  }
}

function loadBikePrice() {
  if (typeof window === 'undefined') return '500'
  try {
    return localStorage.getItem('cw_bike_price') ?? '500'
  } catch {
    return '500'
  }
}

export default function DashboardPage() {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [rides, setRides] = useState<Ride[]>([])
  const [syncMsg, setSyncMsg] = useState('')
  
  // 模块折叠状态管理
  const [collapseSettings, setCollapseSettings] = useState(true)
  const [collapseRoi, setCollapseRoi] = useState(false)
  const [collapseSync, setCollapseSync] = useState(false)
  const [collapseChart, setCollapseChart] = useState(false)
  const [collapseRides, setCollapseRides] = useState(false)

  // 自定义多站点设置（惰性初始化：从本地缓存读取一次）
  const initialSettings = loadCommuteSettings()
  const [homeStation, setHomeStation] = useState(initialSettings.homeStation)
  const [officeStation, setOfficeStation] = useState(initialSettings.officeStation)
  const [morningStart, setMorningStart] = useState(initialSettings.morningStart)
  const [morningEnd, setMorningEnd] = useState(initialSettings.morningEnd)
  const [eveningStart, setEveningStart] = useState(initialSettings.eveningStart)
  const [eveningEnd, setEveningEnd] = useState(initialSettings.eveningEnd)

  // 🚲 Bike ROI 购车成本设置（惰性初始化）
  const [bikePriceInput, setBikePriceInput] = useState<string>(loadBikePrice)
  const [fareSettings, setFareSettings] = useState(DEFAULT_TFL_FARE_SETTINGS)
  const [dashboardLayout, setDashboardLayout] = useState(DEFAULT_DASHBOARD_LAYOUT)
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)

    useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)
      const accessToken = session?.access_token

      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      if (code) {
        await handleExchangeCode(code, user.id, accessToken)
      } else {
        await checkExistingConnection(user.id)
        await fetchRides(user.id)
        await fetchUserSettings(user.id)
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function fetchUserSettings(userId: string) {
    const { data } = await supabase
      .from('settings')
      .select('bike_price, tfl_fare_settings')
      .eq('id', userId)
      .maybeSingle()

    if (data && data.bike_price !== null && data.bike_price !== undefined) {
      const priceStr = data.bike_price.toString()
      setBikePriceInput(priceStr)
      localStorage.setItem('cw_bike_price', priceStr)
    }
    if (data?.tfl_fare_settings) {
      const savedFareSettings = parseTfLFareSettings(data.tfl_fare_settings)
      setFareSettings(savedFareSettings)
      setDashboardLayout(parseDashboardLayout(savedFareSettings.dashboardLayout))
    }
  }

  async function handleExchangeCode(code: string, userId: string, accessToken?: string) {
    setSyncMsg('正在处理 Strava 授权并同步最新记录...')
    setIsSyncing(true)
    try {
      const res = await fetch('/api/strava/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, accessToken })
      })
      if (res.ok) {
        setIsConnected(true)
        window.history.replaceState({}, document.title, '/dashboard')
        await handleSyncInternal(accessToken, userId)
        await fetchUserSettings(userId)
      } else {
        const errData = await res.json()
        setSyncMsg('授权处理失败：' + (errData.error || '未知错误'))
        setIsSyncing(false)
      }
    } catch {
      setSyncMsg('请求异常，请检查网络')
      setIsSyncing(false)
    }
  }

  async function checkExistingConnection(userId: string) {
    const { data } = await supabase
      .from('strava_connections')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (data) {
      setIsConnected(true)
    }
  }

  async function fetchRides(userId: string) {
    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })

    if (data) {
      setRides(data as Ride[])
    }
  }

  async function handleSelectCategory(ride: Ride, newCategory: string) {
    const isSavingsEligible = newCategory === '通勤骑行' || newCategory === '日常交通'

    setRides(rides.map(r => r.id === ride.id ? { 
      ...r, 
      is_commute: isSavingsEligible, 
      category: newCategory,
      is_manual_override: true 
    } : r))

    const { error } = await supabase
      .from('rides')
      .update({ 
        is_commute: isSavingsEligible, 
        category: newCategory,
        is_manual_override: true 
      })
      .eq('id', ride.id)

    if (error && user) fetchRides(user.id)
  }

  async function handleSyncInternal(accessToken: string | undefined, userId: string, fullResync = false) {
    try {
      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessToken, homeStation, officeStation, morningStart, morningEnd, eveningStart, eveningEnd, fullResync
        })
      })
      const result = await res.json()
      if (result.success) {
        setSyncMsg(fullResync
          ? `全量重算完成！已用最新站点库重新计算全部 ${result.count} 条骑行分类。`
          : `同步完成！已按规则识别类别，并完美保留你的手动修改。`)
        fetchRides(userId)
      } else {
        setSyncMsg('同步失败：' + (result.error || '未知错误'))
      }
    } catch {
      setSyncMsg('同步请求发起失败')
    } finally {
      setIsSyncing(false)
    }
  }

  // 全量重算：忽略增量基线，重新拉取 Strava 全部历史并按最新站点库重算分类
  async function handleFullResync() {
    if (!user) return
    setIsSyncing(true)
    setSyncMsg('正在全量重算：会重新拉取全部历史骑行并按最新站点库归类，可能需要几分钟...')
    const { data: { session } } = await supabase.auth.getSession()
    await handleSyncInternal(session?.access_token, user.id, true)
  }

  function handleSaveSettings() {
    const settings = { homeStation, officeStation, morningStart, morningEnd, eveningStart, eveningEnd }
    localStorage.setItem('cw_commute_settings', JSON.stringify(settings))
    setSyncMsg('多站点规则保存成功！重新点击“同步记录”即可刷新三大分类。')
  }

  function handleBikePriceChange(price: string) {
    setBikePriceInput(price)
    localStorage.setItem('cw_bike_price', price)
  }

  async function handleBikePriceBlur() {
    if (!user) return
    const priceNum = parseFloat(bikePriceInput) || 0
    await supabase.from('settings').upsert({ id: user.id, bike_price: priceNum }, { onConflict: 'id' })
  }

  const handleSync = async () => {
    if (!user) return
    setIsSyncing(true)
    setSyncMsg('正在从 Strava 同步最新骑行数据...')
    const { data: { session } } = await supabase.auth.getSession()
    await handleSyncInternal(session?.access_token, user.id)
  }

  const DOMAIN = "https://cycleworth.vercel.app"
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  const redirectUri = `${DOMAIN}/dashboard`
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&approval_prompt=auto&scope=read,activity:read_all`

  const totalDistanceKm = (rides.reduce((acc, r) => acc + (r.distance || 0), 0) / 1000).toFixed(1)
  const roiData = calculateROI(rides, bikePriceInput, fareSettings, lang)
  const chartData = prepareChartData(rides, fareSettings)
  const totalCalories = Math.round(rides.reduce((total, ride) => total + (Number(ride.calories) || 0), 0))
  const sectionOrder = (id: import('../../lib/dashboard-layout').DashboardSection) => dashboardLayout.order.indexOf(id)
  const isSectionVisible = (id: import('../../lib/dashboard-layout').DashboardSection) => !dashboardLayout.hidden.includes(id)
  const rideDetails = lang === 'zh' ? { title: '\u9a91\u884c\u8def\u7ebf\u8be6\u60c5', start: '\u8d77\u70b9\u7ad9', end: '\u7ec8\u70b9\u7ad9', unknown: '\u672a\u77e5', minutes: '\u5206\u949f' } : { title: 'Ride details', start: 'Start station', end: 'End station', unknown: 'Unknown', minutes: 'min' }

  return (
    <main className="min-h-screen bg-slate-50 px-2 py-4 md:p-8 relative">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:gap-6">
        <div className="flex items-start justify-between gap-3 px-1 sm:items-center">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">CycleWorth</h1>
            <p className="text-sm text-slate-500 mt-0.5">{t.tagline}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2"><Link href="/settings" title={lang === 'zh' ? '\u8bbe\u7f6e' : 'Settings'} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 sm:hidden">⚙</Link><Link href="/settings/layout" title={lang === 'zh' ? '\u5e03\u5c40' : 'Layout'} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 sm:hidden">↕</Link><Link href="/settings" className="hidden text-xs font-semibold text-slate-500 hover:text-sky-600 sm:inline">{lang === 'zh' ? '\u8bbe\u7f6e' : 'Settings'}</Link><Link href="/settings/layout" className="hidden text-xs font-semibold text-slate-500 hover:text-sky-600 md:inline">{lang === 'zh' ? '\u5e03\u5c40' : 'Layout'}</Link><LanguageSwitcher /><div className="hidden text-right text-xs text-slate-400 lg:block">{user?.email}</div></div>
        </div>

        {isSectionVisible('advice') && <div style={{ order: sectionOrder('advice') }}><RideAdviceCard /></div>}

        {isSectionVisible('stats') && <div style={{ order: sectionOrder('stats') }}><StatsGrid 
          totalRides={rides.length} 
          totalDistanceKm={totalDistanceKm} 
          estimatedSavings={roiData.estimatedSavings} 
          totalCalories={totalCalories}
        /></div>}
        {user && isSectionVisible('maintenance') && <div style={{ order: sectionOrder('maintenance') }}><MaintenanceCard userId={user.id} odometerKm={Number(totalDistanceKm)} /></div>}
        {isSectionVisible('weekly') && <div style={{ order: sectionOrder('weekly') }}><RideHeatmap rides={rides} /></div>}

        {isSectionVisible('roi') && <div style={{ order: sectionOrder('roi') }}><BikeROICard 
          {...roiData}
          collapseRoi={collapseRoi}
          setCollapseRoi={setCollapseRoi}
          bikePriceInput={bikePriceInput}
          handleBikePriceChange={handleBikePriceChange}
          handleBikePriceBlur={handleBikePriceBlur}
        /></div>}

        {isSectionVisible('settings') && <div style={{ order: sectionOrder('settings') }}><SettingsPanel 
          collapseSettings={collapseSettings}
          setCollapseSettings={setCollapseSettings}
          homeStation={homeStation} setHomeStation={setHomeStation}
          officeStation={officeStation} setOfficeStation={setOfficeStation}
          morningStart={morningStart} setMorningStart={setMorningStart}
          morningEnd={morningEnd} setMorningEnd={setMorningEnd}
          eveningStart={eveningStart} setEveningStart={setEveningStart}
          eveningEnd={eveningEnd} setEveningEnd={setEveningEnd}
          handleSaveSettings={handleSaveSettings}
        /></div>}

        {isSectionVisible('sync') && <div style={{ order: sectionOrder('sync') }}><SyncStatus 
          collapseSync={collapseSync}
          setCollapseSync={setCollapseSync}
          isConnected={isConnected}
          stravaAuthUrl={stravaAuthUrl}
          handleSync={handleSync}
          handleFullResync={handleFullResync}
          isSyncing={isSyncing}
        /></div>}

        {syncMsg && (
          <div className="flex items-center gap-2 text-xs md:text-sm text-sky-700 bg-sky-50 p-3.5 rounded-2xl border border-sky-100 shadow-sm">
            <span className="text-base">💡</span>
            <p className="font-medium">{syncMsg}</p>
          </div>
        )}

        {isSectionVisible('chart') && <div style={{ order: sectionOrder('chart') }}><WeeklyChart 
          collapseChart={collapseChart}
          setCollapseChart={setCollapseChart}
          chartData={chartData}
        /></div>}

        {isSectionVisible('rides') && <div style={{ order: sectionOrder('rides') }}><RideList 
          rides={rides}
          fareSettings={fareSettings}
          collapseRides={collapseRides}
          setCollapseRides={setCollapseRides}
          setSelectedRide={setSelectedRide}
          handleSelectCategory={handleSelectCategory}
        /></div>}
      </div>

      {selectedRide && (
        <div onClick={() => setSelectedRide(null)} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-xs transition-all md:items-center md:p-4">
          <div onClick={event => event.stopPropagation()} className="w-full animate-in slide-in-from-bottom space-y-4 rounded-t-3xl border border-slate-100 bg-white p-6 shadow-2xl fade-in duration-200 md:w-[480px] md:rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg truncate max-w-[280px]">
                  {selectedRide.name || rideDetails.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDateCN(selectedRide.start_date, lang)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  📏 {(selectedRide.distance / 1000).toFixed(2)} km · 🕒 {Math.round(selectedRide.moving_time / 60)} {rideDetails.minutes} · 🔥 {Math.round(Number(selectedRide.calories) || 0).toLocaleString()} kcal
                </p>
              </div>
              <button 
                onClick={() => setSelectedRide(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="w-full h-56 rounded-2xl overflow-hidden relative">
              <RideMap polyline={selectedRide.summary_polyline} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">{rideDetails.start}</span>
                <span className="font-semibold text-slate-700">{selectedRide.start_station || rideDetails.unknown}</span>
              </div>
              <span className="text-slate-400 font-bold">→</span>
              <div>
                <span className="text-slate-400 block text-[10px]">{rideDetails.end}</span>
                <span className="font-semibold text-slate-700">{selectedRide.end_station || rideDetails.unknown}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
