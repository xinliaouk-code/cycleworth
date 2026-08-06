'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase'

// Components
import { StatsGrid } from './_components/StatsGrid'
import { BikeROICard } from './_components/BikeROICard'
import { SettingsPanel } from './_components/SettingsPanel'
import { SyncStatus } from './_components/SyncStatus'
import { WeeklyChart } from './_components/WeeklyChart'
import { RideList } from './_components/RideList'

// Utils & Types
import { Ride, formatDateCN, calculateROI, prepareChartData } from './_lib/utils'

const RideMap = dynamic<{ polyline: string }>(
  () => import('../../components/RideMap'), 
  { ssr: false }
)

export default function DashboardPage() {
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

  // 自定义多站点设置
  const [homeStation, setHomeStation] = useState('Custom House, Royal Victoria')
  const [officeStation, setOfficeStation] = useState('Bank, Old Street')
  const [morningStart, setMorningStart] = useState('7')
  const [morningEnd, setMorningEnd] = useState('10')
  const [eveningStart, setEveningStart] = useState('16')
  const [eveningEnd, setEveningEnd] = useState('20')

  // 🚲 Bike ROI 购车成本设置
  const [bikePriceInput, setBikePriceInput] = useState<string>('500')
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)

  useEffect(() => {
    const savedSettings = localStorage.getItem('cw_commute_settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        if (parsed.homeStation) setHomeStation(parsed.homeStation)
        if (parsed.officeStation) setOfficeStation(parsed.officeStation)
        if (parsed.morningStart) setMorningStart(parsed.morningStart)
        if (parsed.morningEnd) setMorningEnd(parsed.morningEnd)
        if (parsed.eveningStart) setEveningStart(parsed.eveningStart)
        if (parsed.eveningEnd) setEveningEnd(parsed.eveningEnd)
      } catch (e) {}
    }

    const savedPrice = localStorage.getItem('cw_bike_price')
    if (savedPrice) {
      setBikePriceInput(savedPrice)
    }
  }, [])

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
  }, [router])

  async function fetchUserSettings(userId: string) {
    const { data } = await supabase
      .from('settings')
      .select('bike_price')
      .eq('id', userId)
      .maybeSingle()

    if (data && data.bike_price !== null && data.bike_price !== undefined) {
      const priceStr = data.bike_price.toString()
      setBikePriceInput(priceStr)
      localStorage.setItem('cw_bike_price', priceStr)
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
    } catch (error) {
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

  async function handleSyncInternal(accessToken: string | undefined, userId: string) {
    try {
      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessToken, homeStation, officeStation, morningStart, morningEnd, eveningStart, eveningEnd
        })
      })
      const result = await res.json()
      if (result.success) {
        setSyncMsg(`同步完成！已按规则识别类别，并完美保留你的手动修改。`)
        fetchRides(userId)
      } else {
        setSyncMsg('同步失败：' + (result.error || '未知错误'))
      }
    } catch (err) {
      setSyncMsg('同步请求发起失败')
    } finally {
      setIsSyncing(false)
    }
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
  const roiData = calculateROI(rides, bikePriceInput)
  const chartData = prepareChartData(rides)

  return (
    <main className="min-h-screen bg-slate-50 px-2 py-4 md:p-8 relative">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">CycleWorth</h1>
            <p className="text-sm text-slate-500 mt-0.5">Every ride has value.</p>
          </div>
          <div className="text-right text-xs text-slate-400">{user?.email}</div>
        </div>

        <StatsGrid 
          totalRides={rides.length} 
          totalDistanceKm={totalDistanceKm} 
          estimatedSavings={roiData.estimatedSavings} 
        />

        <BikeROICard 
          {...roiData}
          collapseRoi={collapseRoi}
          setCollapseRoi={setCollapseRoi}
          bikePriceInput={bikePriceInput}
          handleBikePriceChange={handleBikePriceChange}
          handleBikePriceBlur={handleBikePriceBlur}
        />

        <SettingsPanel 
          collapseSettings={collapseSettings}
          setCollapseSettings={setCollapseSettings}
          homeStation={homeStation} setHomeStation={setHomeStation}
          officeStation={officeStation} setOfficeStation={setOfficeStation}
          morningStart={morningStart} setMorningStart={setMorningStart}
          morningEnd={morningEnd} setMorningEnd={setMorningEnd}
          eveningStart={eveningStart} setEveningStart={setEveningStart}
          eveningEnd={eveningEnd} setEveningEnd={setEveningEnd}
          handleSaveSettings={handleSaveSettings}
        />

        <SyncStatus 
          collapseSync={collapseSync}
          setCollapseSync={setCollapseSync}
          isConnected={isConnected}
          stravaAuthUrl={stravaAuthUrl}
          handleSync={handleSync}
          isSyncing={isSyncing}
        />

        {syncMsg && (
          <div className="flex items-center gap-2 text-xs md:text-sm text-sky-700 bg-sky-50 p-3.5 rounded-2xl border border-sky-100 shadow-sm">
            <span className="text-base">💡</span>
            <p className="font-medium">{syncMsg}</p>
          </div>
        )}

        <WeeklyChart 
          collapseChart={collapseChart}
          setCollapseChart={setCollapseChart}
          chartData={chartData}
        />

        <RideList 
          rides={rides}
          collapseRides={collapseRides}
          setCollapseRides={setCollapseRides}
          setSelectedRide={setSelectedRide}
          handleSelectCategory={handleSelectCategory}
        />
      </div>

      {selectedRide && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-xs transition-all p-0 md:p-4">
          <div className="bg-white w-full md:w-[480px] rounded-t-3xl md:rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg truncate max-w-[280px]">
                  {selectedRide.name || '骑行路线详情'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDateCN(selectedRide.start_date)} · {(selectedRide.distance / 1000).toFixed(2)} km
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
                <span className="text-slate-400 block text-[10px]">起点站</span>
                <span className="font-semibold text-slate-700">{selectedRide.start_station || '未知'}</span>
              </div>
              <span className="text-slate-400 font-bold">→</span>
              <div>
                <span className="text-slate-400 block text-[10px]">终点站</span>
                <span className="font-semibold text-slate-700">{selectedRide.end_station || '未知'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}