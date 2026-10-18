'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Settings, SlidersHorizontal, X, Clock, Flame, Ruler, ArrowRight, Gauge, Share2 } from 'lucide-react'
import { dataClient } from '../../lib/data-client'

import { navigationHref, navigationIds, navigationLabels, viewSections, type NavigationId } from '../../lib/navigation'

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
import { ElevationProfile } from './_components/ElevationProfile'
import { ImpactShareModal } from './_components/ImpactShareModal'

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
  return <Suspense fallback={<main className="app-shell p-6">CycleWorth…</main>}><DashboardContent /></Suspense>
}
function DashboardContent() {
  const search = useSearchParams()
  const requestedView = search.get('view') ?? 'overview'
  const view = Object.hasOwn(viewSections, requestedView) ? requestedView : 'overview'

  const { t, lang } = useLanguage()
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(demoUser)
  const [isDemoMode, setIsDemoMode] = useState(true)
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
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    if (!selectedRide) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [selectedRide])

  useEffect(() => {
    async function init() {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
      const forceDemo = urlParams.get('demo') === 'true'

      if (forceDemo) {
        setIsDemoMode(true)
        setUser(demoUser)
        setRides(demoRides)
        return
      }

      let session = null
      try {
        session = (await dataClient.auth.getSession()).data.session
      } catch {
        setIsDemoMode(false); setRides([]); setUser(null)
        setSyncMsg('Unable to load your account. Please sign in or retry.')
        return
      }

      const activeUser = session?.user ?? null

      if (!activeUser) {
        setIsDemoMode(true)
        setUser(demoUser)
        setRides(demoRides)
        return
      }

      setIsDemoMode(false)
      setUser(activeUser)
      await fetchRides(activeUser.id)
      await fetchUserSettings(activeUser.id)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function fetchUserSettings(userId: string) {
    const { data } = await dataClient
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

  async function fetchRides(userId: string) {
    const { data } = await dataClient
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
      const { error } = await dataClient
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

  function handleSaveSettings() {
    const settings = { homeStation, officeStation, morningStart, morningEnd, eveningStart, eveningEnd }
    localStorage.setItem('cw_commute_settings', JSON.stringify(settings))
    setSyncMsg(lang === 'zh' ? '通勤规则已保存；下一次导入时使用。' : 'Commute rules saved successfully.')
  }

  function handleBikePriceChange(price: string) {
    setBikePriceInput(price)
    localStorage.setItem('cw_bike_price', price)
  }

  async function handleBikePriceBlur() {
    if (!user || isDemoMode) return
    const priceNum = parseFloat(bikePriceInput) || 0
    await dataClient.from('settings').upsert({ id: user.id, bike_price: priceNum }, { onConflict: 'id' })
  }

  const totalDistanceKm = (rides.reduce((acc, r) => acc + (r.distance || 0), 0) / 1000).toFixed(1)
  const roiData = calculateROI(rides, bikePriceInput, fareSettings, lang)
  const chartData = prepareChartData(rides, fareSettings)
  const totalCalories = Math.round(rides.reduce((total, ride) => total + (Number(ride.calories) || 0), 0))
  const sectionOrder = (id: import('../../lib/dashboard-layout').DashboardSection) => dashboardLayout.order.indexOf(id)
  const isSectionVisible = (id: import('../../lib/dashboard-layout').DashboardSection) => viewSections[view].includes(id) && !dashboardLayout.hidden.includes(id)
  const rideDetails = lang === 'zh' ? { title: '\u9a91\u884c\u8def\u7ebf\u8be6\u60c5', start: '\u8d77\u70b9\u7ad9', end: '\u7ec8\u70b9\u7ad9', unknown: '\u672a\u77e5', minutes: '\u5206\u949f' } : { title: 'Ride details', start: 'Start station', end: 'End station', unknown: 'Unknown', minutes: 'min' }

  return (
    <main className="app-shell min-h-screen px-3 py-4 md:px-8 md:py-8 relative">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:gap-6">
        <header className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="soft-control flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-xs">
                <Image src="/brand/cycleworth-icon-hd.png" alt="CycleWorth" width={96} height={96} priority className="h-full w-full object-cover" />
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight md:text-2xl">
                CycleWorth
              </h1>
            </div>
            <p className="hidden sm:block text-xs font-medium text-slate-500 mt-0.5">{t.tagline}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setShareOpen(true)} title={lang === 'zh' ? '生成骑行战报' : 'Generate riding report'} className="flex h-11 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2.5 text-xs font-bold text-sky-700 shadow-2xs transition hover:bg-sky-100 active:scale-95"><Share2 className="h-4 w-4" /><span className="hidden sm:inline">{lang === 'zh' ? '战报' : 'Report'}</span></button>
            <Link
              href="/settings"
              title={lang === 'zh' ? '设置' : 'Settings'}
              className="soft-control flex h-11 w-11 items-center justify-center rounded-xl border text-slate-600 shadow-2xs active:scale-95 transition"
            >
              <Settings className="h-4 w-4" />
            </Link>

            <Link
              href="/settings/layout"
              title={lang === 'zh' ? '自定义布局' : 'Layout'}
              className="soft-control hidden sm:flex h-11 w-11 items-center justify-center rounded-xl border text-slate-600 shadow-2xs active:scale-95 transition"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Link>

            <div className="hidden sm:block"><LanguageSwitcher /></div>

            {user?.email && (
              <span className="hidden text-xs font-medium text-slate-400 lg:block truncate max-w-[160px]">
                {user.email}
              </span>
            )}
          </div>
        </header>

        {isDemoMode && (
          <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-indigo-50/50 to-emerald-50/60 p-3.5 px-4 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5 font-medium text-slate-800">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white font-black text-[11px] shadow-xs">
                ⚡
              </span>
              <span>
                {lang === 'zh'
                  ? '演示数据'
                  : 'Demo data'}
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
                className="hidden sm:inline-flex font-bold text-slate-700 bg-white/90 hover:bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition active:scale-95 text-[11px]"
              >
                {collapseRides && collapseRoi ? (lang === 'zh' ? '展开全部模块' : 'Expand All') : (lang === 'zh' ? '收起全部模块' : 'Collapse All')}
              </button>
              <Link
                href="/login"
                className="font-bold text-sky-700 hover:text-sky-800 bg-white/90 hover:bg-white px-3 py-1 rounded-lg border border-sky-200/80 shadow-2xs transition active:scale-95"
              >
                {lang === 'zh' ? '登录导入骑行 →' : 'Sign in →'}
              </Link>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 px-1">
          <div><p className="hidden sm:block text-xs font-medium uppercase tracking-widest text-emerald-700">{lang === 'zh' ? '骑行生活' : 'Your cycling life'}</p><h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:mt-1 sm:text-3xl">{navigationLabels[view as NavigationId][lang]}</h2><p className="mt-2 hidden text-sm text-slate-500 sm:block">{({ overview: { zh: '每一次出发，都有所收获。', en: 'Every ride adds up.' }, rides: { zh: '记录每段路，回看每次出发。', en: 'Every journey, in one place.' }, bike: { zh: '了解爱车的价值，照顾它的状态。', en: 'Keep your bike in good shape.' }, trends: { zh: '让坚持可见。', en: 'See your consistency take shape.' } }[view] ?? { zh: '', en: '' })[lang]}</p></div>
          <details className="relative shrink-0"><summary className="cursor-pointer rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-xs font-semibold text-slate-600">{lang === 'zh' ? '全部功能' : 'Explore'}</summary><div className="absolute right-0 top-full z-30 mt-2 grid w-44 gap-1 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">{navigationIds.map(id => <Link key={id} href={navigationHref(id, search.get('demo') === 'true')} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open') }} className="rounded-xl px-3 py-3 text-sm hover:bg-emerald-50">{navigationLabels[id][lang]}</Link>)}</div></details>
        </div>
        {viewSections[view].every(id => dashboardLayout.hidden.includes(id)) && <p className="rounded-2xl bg-white p-5 text-sm text-slate-600">{lang === 'zh' ? '此页的模块已在布局设置中隐藏。' : 'This page’s modules are hidden in layout settings.'} <Link className="underline" href="/settings/layout">{lang === 'zh' ? '调整布局' : 'Edit layout'}</Link></p>}

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
          demo={isDemoMode}
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
            role="dialog"
            aria-modal="true"
            aria-label={rideDetails.title}
            className="ride-detail-sheet h-[66dvh] w-full touch-pan-y overflow-y-auto overscroll-contain animate-in slide-in-from-bottom space-y-3 rounded-t-3xl border border-slate-100 bg-white p-4 shadow-2xl fade-in duration-200 md:h-auto md:max-h-[calc(100dvh-2rem)] md:w-[500px] md:rounded-2xl md:p-6"
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
                aria-label={lang === 'zh' ? '关闭骑行详情' : 'Close ride details'}
                onClick={() => setSelectedRide(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 active:scale-95 cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-40 w-full overflow-hidden rounded-2xl border border-slate-100 md:h-56">
              <RideMap polyline={selectedRide.summary_polyline} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-100 bg-sky-50/60 p-2.5"><span className="text-slate-500">{lang === 'zh' ? '平均速度' : 'Average speed'}</span><strong className="mt-1 flex items-center gap-1 text-sm text-slate-800"><Gauge className="h-3.5 w-3.5 text-sky-600" />{((selectedRide.average_speed ?? ((selectedRide.distance / 1000) / (selectedRide.moving_time / 3600) / 3.6)) * 3.6).toFixed(1)} km/h</strong></div>
              <div className="rounded-xl border border-slate-100 bg-indigo-50/60 p-2.5"><span className="text-slate-500">{lang === 'zh' ? '最高速度' : 'Top speed'}</span><strong className="mt-1 flex items-center gap-1 text-sm text-slate-800"><Gauge className="h-3.5 w-3.5 text-indigo-600" />{selectedRide.max_speed == null ? '—' : `${(selectedRide.max_speed * 3.6).toFixed(1)} km/h`}</strong></div>
            </div>

            <ElevationProfile ride={selectedRide} />

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
      <ImpactShareModal open={shareOpen} onClose={() => setShareOpen(false)} rides={rides} fareSettings={fareSettings} roi={roiData.roiPercentageStr} lang={lang} />
    </main>
  )
}
