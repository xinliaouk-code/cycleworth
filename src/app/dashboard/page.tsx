'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Settings, SlidersHorizontal, X, Clock, Flame, Ruler, MapPin, ArrowRight } from 'lucide-react'
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
import { demoRides, demoMaintenanceTasks, demoUser } from '../demo/mock-data'

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
  if (typeof window === 'undefined') return '799'
  try {
    return localStorage.getItem('cw_bike_price') ?? '799'
  } catch {
    return '799'
  }
}

export default function DashboardPage() {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(demoUser)
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [rides, setRides] = useState<Ride[]>(demoRides)
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
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
      const forceDemo = urlParams.get('demo') === 'true'
      const isPlaceholderSupabase = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (forceDemo || isPlaceholderSupabase) {
        setIsDemoMode(true)
        setUser(demoUser)
        setRides(demoRides)
        setIsConnected(true)
        return
      }

      let session = null
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 1000)
        )
        const res = await Promise.race([sessionPromise, timeoutPromise])
        session = res.data.session
      } catch (err) {
        console.warn('Supabase auth session fetch error:', err)
      }

      const activeUser = session?.user ?? null

      if (!activeUser) {
        setIsDemoMode(true)
        setUser(demoUser)
        setRides(demoRides)
        setIsConnected(true)
        return
      }

      setIsDemoMode(false)
      setUser(activeUser)
      const accessToken = session?.access_token

      const code = urlParams.get('code')
      if (code) {
        await handleExchangeCode(code, activeUser.id, accessToken)
      } else {
        await checkExistingConnection(activeUser.id)
        await fetchRides(activeUser.id)
        await fetchUserSettings(activeUser.id)
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

    if (!isDemoMode && user?.id) {
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
    if (isDemoMode) {
      setSyncMsg(lang === 'zh' ? '演示模式：已根据最新站点规则归类 40 条骑行记录。' : 'Demo Mode: Classified 40 sample rides.')
      setTimeout(() => setIsSyncing(false), 500)
      return
    }
    setSyncMsg('正在全量重算：会重新拉取全部历史骑行并按最新站点库归类，可能需要几分钟...')
    const { data: { session } } = await supabase.auth.getSession()
    await handleSyncInternal(session?.access_token, user.id, true)
  }

  function handleSaveSettings() {
    const settings = { homeStation, officeStation, morningStart, morningEnd, eveningStart, eveningEnd }
    localStorage.setItem('cw_commute_settings', JSON.stringify(settings))
    setSyncMsg(lang === 'zh' ? '多站点规则保存成功！重新点击“同步记录”即可刷新三大分类。' : 'Commute rules saved successfully.')
  }

  function handleBikePriceChange(price: string) {
    setBikePriceInput(price)
    localStorage.setItem('cw_bike_price', price)
  }

  async function handleBikePriceBlur() {
    if (!user || isDemoMode) return
    const priceNum = parseFloat(bikePriceInput) || 0
    await supabase.from('settings').upsert({ id: user.id, bike_price: priceNum }, { onConflict: 'id' })
  }

  const handleSync = async () => {
    if (!user) return
    setIsSyncing(true)
    if (isDemoMode) {
      setSyncMsg(lang === 'zh' ? '演示模式：与 Strava 样本库同步更新完成！' : 'Demo Mode: Synced with sample data!')
      setTimeout(() => setIsSyncing(false), 500)
      return
    }
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
  const syncFailed = syncMsg.includes('\u5931\u8d25') || syncMsg.toLowerCase().includes('failed')
  const sectionOrder = (id: import('../../lib/dashboard-layout').DashboardSection) => dashboardLayout.order.indexOf(id)
  const isSectionVisible = (id: import('../../lib/dashboard-layout').DashboardSection) => !dashboardLayout.hidden.includes(id)
  const rideDetails = lang === 'zh' ? { title: '\u9a91\u884c\u8def\u7ebf\u8be6\u60c5', start: '\u8d77\u70b9\u7ad9', end: '\u7ec8\u70b9\u7ad9', unknown: '\u672a\u77e5', minutes: '\u5206\u949f' } : { title: 'Ride details', start: 'Start station', end: 'End station', unknown: 'Unknown', minutes: 'min' }

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 md:px-8 md:py-8 relative">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:gap-6">
        <header className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-xs font-black text-white shadow-xs">
                CW
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight md:text-2xl">
                CycleWorth
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{t.tagline}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/settings"
              title={lang === 'zh' ? '设置' : 'Settings'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
            >
              <Settings className="h-4 w-4" />
            </Link>

            <Link
              href="/settings/layout"
              title={lang === 'zh' ? '自定义布局' : 'Layout'}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Link>

            <LanguageSwitcher />

            {user?.email && (
              <span className="hidden text-xs font-medium text-slate-400 lg:block truncate max-w-[160px]">
                {user.email}
              </span>
            )}
          </div>
        </header>

        {isDemoMode && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-indigo-50/50 to-emerald-50/60 p-3.5 px-4 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5 font-medium text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white font-black text-[11px] shadow-xs">
                ⚡
              </span>
              <span>
                {lang === 'zh'
                  ? 'AI Studio 演示模式：正在展示 40 趟伦敦真实骑行轨迹、省钱回报与维护数据。'
                  : 'AI Studio Demo Mode: Showing 40 London ride activities & full analytics.'}
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => {
                  const allCollapsed = collapseRides && collapseRoi && collapseChart
                  setCollapseRides(!allCollapsed)
                  setCollapseRoi(!allCollapsed)
                  setCollapseChart(!allCollapsed)
                  setCollapseSettings(!allCollapsed)
                  setCollapseSync(!allCollapsed)
                }}
                className="font-bold text-slate-700 bg-white/90 hover:bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition active:scale-95 text-[11px]"
              >
                {collapseRides && collapseRoi ? (lang === 'zh' ? '展开全部模块' : 'Expand All') : (lang === 'zh' ? '收起全部模块' : 'Collapse All')}
              </button>
              <Link
                href="/login"
                className="font-bold text-sky-700 hover:text-sky-800 bg-white/90 hover:bg-white px-3 py-1 rounded-lg border border-sky-200/80 shadow-2xs transition active:scale-95"
              >
                {lang === 'zh' ? '登录真实 Strava 账号 →' : 'Connect Strava Account →'}
              </Link>
            </div>
          </div>
        )}

        {isSectionVisible('advice') && <div style={{ order: sectionOrder('advice') }}><RideAdviceCard /></div>}

        {isSectionVisible('stats') && <div style={{ order: sectionOrder('stats') }}><StatsGrid 
          totalRides={rides.length} 
          totalDistanceKm={totalDistanceKm} 
          estimatedSavings={roiData.estimatedSavings} 
          totalCalories={totalCalories}
        /></div>}
        {user && isSectionVisible('maintenance') && <div style={{ order: sectionOrder('maintenance') }}><MaintenanceCard userId={user.id} odometerKm={Number(totalDistanceKm)} demoTasks={isDemoMode ? demoMaintenanceTasks : undefined} /></div>}
        {isSectionVisible('weekly') && <div style={{ order: sectionOrder('weekly') }}><RideHeatmap rides={rides} /></div>}

        {isSectionVisible('roi') && <div style={{ order: sectionOrder('roi') }}><BikeROICard 
          {...roiData}
          collapseRoi={collapseRoi}
          setCollapseRoi={setCollapseRoi}
          bikePriceInput={bikePriceInput}
          handleBikePriceChange={handleBikePriceChange}
          handleBikePriceBlur={handleBikePriceBlur}
          totalDistanceKm={Number(totalDistanceKm)}
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
          errorMessage={syncFailed ? syncMsg : undefined}
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
        <div
          onClick={() => setSelectedRide(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs transition-all md:items-center md:p-4"
        >
          <div
            onClick={event => event.stopPropagation()}
            className="w-full animate-in slide-in-from-bottom space-y-4 rounded-t-3xl border border-slate-100 bg-white p-5 shadow-2xl fade-in duration-200 md:w-[500px] md:rounded-2xl md:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900 truncate">
                  {selectedRide.name || rideDetails.title}
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  {formatDateCN(selectedRide.start_date, lang)}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1">
                    <Ruler className="h-3.5 w-3.5 text-sky-500" />
                    {(selectedRide.distance / 1000).toFixed(2)} km
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    {Math.round(selectedRide.moving_time / 60)} {rideDetails.minutes}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-orange-500" />
                    {Math.round(Number(selectedRide.calories) || 0).toLocaleString()} kcal
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedRide(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 active:scale-95 cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="w-full h-56 rounded-2xl overflow-hidden relative border border-slate-100">
              <RideMap polyline={selectedRide.summary_polyline} />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="min-w-0 flex-1 truncate">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{rideDetails.start}</span>
                <span className="block font-semibold text-slate-800 truncate">{selectedRide.start_station || rideDetails.unknown}</span>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 px-1" />
              <div className="min-w-0 flex-1 truncate text-right">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{rideDetails.end}</span>
                <span className="block font-semibold text-slate-800 truncate">{selectedRide.end_station || rideDetails.unknown}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
