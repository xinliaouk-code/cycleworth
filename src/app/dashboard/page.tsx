'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const RideMap = dynamic<{ polyline: string }>(
  () => import('../../components/RideMap'), 
  { ssr: false }
)

type Ride = {
  id: string;
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
  is_commute: boolean;
  category?: string; // 通勤骑行 / 日常交通 / 休闲骑行
  is_manual_override?: boolean;
  start_station?: string;
  end_station?: string;
  summary_polyline: string;
}

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

  function handleSaveSettings() {
    const settings = { homeStation, officeStation, morningStart, morningEnd, eveningStart, eveningEnd }
    localStorage.setItem('cw_commute_settings', JSON.stringify(settings))
    setSyncMsg('多站点规则保存成功！重新点击“同步记录”即可刷新三大分类。')
  }

  function handleSaveBikePrice(price: string) {
    setBikePriceInput(price)
    localStorage.setItem('cw_bike_price', price)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      // @ts-ignore
      setUser(user)

      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      if (code) {
        await handleExchangeCode(code, user.id)
      } else {
        await checkExistingConnection(user.id)
        await fetchRides(user.id)
      }
    }
    init()
  }, [router])

  async function handleExchangeCode(code: string, userId: string) {
    setSyncMsg('正在处理 Strava 授权并同步最新记录...')
    setIsSyncing(true)
    try {
      const res = await fetch('/api/strava/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId })
      })
      if (res.ok) {
        setIsConnected(true)
        window.history.replaceState({}, document.title, '/dashboard')
        await handleSyncInternal(userId)
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

  // 🔽 下拉菜单直接切换分类函数
  async function handleSelectCategory(ride: Ride, newCategory: string) {
    const isSavingsEligible = newCategory === '通勤骑行' || newCategory === '日常交通'

    // 乐观更新 UI
    setRides(rides.map(r => r.id === ride.id ? { 
      ...r, 
      is_commute: isSavingsEligible, 
      category: newCategory,
      is_manual_override: true 
    } : r))

    // 持久化到 Supabase
    const { error } = await supabase
      .from('rides')
      .update({ 
        is_commute: isSavingsEligible, 
        category: newCategory,
        is_manual_override: true 
      })
      .eq('id', ride.id)

    if (error) {
      console.error('更新分类失败:', error.message)
      if (user) fetchRides(user.id)
    }
  }

  async function handleSyncInternal(userId: string) {
    try {
      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          homeStation,
          officeStation,
          morningStart,
          morningEnd,
          eveningStart,
          eveningEnd
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

  async function handleSync() {
    if (!user) return
    setIsSyncing(true)
    setSyncMsg('正在从 Strava 同步最新骑行数据...')
    await handleSyncInternal(user.id)
  }

  const DOMAIN = "https://cycleworth.vercel.app"
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  const redirectUri = `${DOMAIN}/dashboard`
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&approval_prompt=auto&scope=read,activity:read_all`

  const totalDistanceKm = (rides.reduce((acc, r) => acc + (r.distance || 0), 0) / 1000).toFixed(1)
  const commuteRidesCount = rides.filter(r => r.is_commute).length
  const estimatedSavings = (commuteRidesCount * 3.90).toFixed(2)

  // 🚲 Bike ROI 计算逻辑
  const savingsNum = Number(estimatedSavings)
  const priceNum = parseFloat(bikePriceInput) || 0
  const roiPercentageNum = priceNum > 0 ? (savingsNum / priceNum) * 100 : 0
  const roiPercentageStr = roiPercentageNum.toFixed(1)

  let paybackText = ''
  let isFullyPaidBack = false

  if (priceNum <= 0) {
    paybackText = '请在右上角设置购车金额'
  } else if (savingsNum >= priceNum) {
    isFullyPaidBack = true
    const profit = (savingsNum - priceNum).toFixed(2)
    paybackText = `已成功回本！🎉 (净收益 £${profit})`
  } else {
    const remainingAmount = priceNum - savingsNum
    const remainingRides = Math.ceil(remainingAmount / 3.90)
    
    const eligibleDates = rides
      .filter(r => r.is_commute && r.start_date)
      .map(r => new Date(r.start_date).getTime())
      .filter(t => !isNaN(t))

    let ridesPerDay = 0.57
    if (eligibleDates.length > 0) {
      const earliestTime = Math.min(...eligibleDates)
      const nowTime = Date.now()
      const diffDays = Math.max(7, (nowTime - earliestTime) / (1000 * 60 * 60 * 24))
      ridesPerDay = eligibleDates.length / diffDays
    }

    const daysNeeded = Math.ceil(remainingRides / (ridesPerDay || 0.57))
    const targetDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000)
    const targetYear = targetDate.getFullYear()
    const targetMonth = targetDate.getMonth() + 1

    paybackText = `预计 ${targetYear}年${targetMonth}月 (约 ${remainingRides} 次骑行)`
  }

  function getWeekKey(dateStr: string) {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    return monday.toISOString().substring(0, 10)
  }

  const weeklyMap = new Map<string, { distance: number; savings: number; count: number }>()
  rides.forEach(r => {
    if (!r.start_date) return
    const weekKey = getWeekKey(r.start_date)
    const curr = weeklyMap.get(weekKey) || { distance: 0, savings: 0, count: 0 }
    curr.distance += (r.distance || 0) / 1000
    if (r.is_commute) curr.savings += 3.90
    curr.count += 1
    weeklyMap.set(weekKey, curr)
  })

  const chartData = Array.from(weeklyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, val]) => ({
      shortWeek: week,
      distance: Number(val.distance.toFixed(1)),
      savings: Number(val.savings.toFixed(2)),
      count: val.count
    }))

  return (
    <main className="min-h-screen bg-slate-50 px-2 py-4 md:p-8 relative">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              CycleWorth
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Every ride has value.
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            {user?.email}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs md:text-sm font-medium text-slate-400">总骑行次数</p>
            <p className="text-xl md:text-3xl font-bold text-slate-800 mt-1 md:mt-2">{rides.length} <span className="text-xs md:text-sm font-normal text-slate-500">次</span></p>
          </div>
          <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs md:text-sm font-medium text-slate-400">总骑行距离</p>
            <p className="text-xl md:text-3xl font-bold text-slate-800 mt-1 md:mt-2">{totalDistanceKm} <span className="text-xs md:text-sm font-normal text-slate-500">km</span></p>
          </div>
          <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 bg-gradient-to-br from-sky-50 to-white">
            <p className="text-xs md:text-sm font-medium text-sky-600">已节省开支</p>
            <p className="text-xl md:text-3xl font-bold text-sky-700 mt-1 md:mt-2">£{estimatedSavings}</p>
          </div>
        </div>

        {/* 🚲 Bike ROI 回报率计算卡片 */}
        <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCollapseRoi(!collapseRoi)}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition cursor-pointer"
                title={collapseRoi ? "展开模块" : "收起模块"}
              >
                {collapseRoi ? '+' : '−'}
              </button>
              <h2 className="text-base md:text-lg font-semibold text-slate-800">🚲 自行车投资回报率 (Bike ROI)</h2>
            </div>
            {!collapseRoi && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden md:inline">购车/装备成本 (£):</span>
                <input 
                  type="number" 
                  value={bikePriceInput}
                  onChange={(e) => handleSaveBikePrice(e.target.value)}
                  placeholder="如: 500"
                  className="w-20 md:w-24 px-2.5 py-1 text-xs md:text-sm border border-slate-200 rounded-xl font-medium text-slate-700 text-center focus:outline-none focus:border-sky-500"
                />
              </div>
            )}
          </div>

          {!collapseRoi && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block font-medium">已节省开支 (Savings)</span>
                  <span className="text-xl font-bold text-slate-800 mt-1 block">£{estimatedSavings}</span>
                </div>
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block font-medium">ROI 回报率</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">{roiPercentageStr}%</span>
                </div>
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 block font-medium">Estimated Payback (预估回本)</span>
                  <span className={`text-xs md:text-sm font-bold mt-1.5 block ${isFullyPaidBack ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {paybackText}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-500">回本进度 (Progress)</span>
                  <span className="text-emerald-600 font-bold">{roiPercentageStr}%</span>
                </div>
                <div className="w-full bg-slate-200/80 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, roiPercentageNum))}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ⚙️ 通勤规则多站点自定义设置 */}
        <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCollapseSettings(!collapseSettings)}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition cursor-pointer"
                title={collapseSettings ? "展开模块" : "收起模块"}
              >
                {collapseSettings ? '+' : '−'}
              </button>
              <h2 className="text-base md:text-lg font-semibold text-slate-800">⚙️ 通勤与日常交通规则设置</h2>
            </div>
          </div>

          {!collapseSettings && (
            <div className="space-y-4 pt-2 border-t border-slate-100 text-xs md:text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">🏠 家附近站点 (用逗号分隔)</label>
                  <input 
                    type="text" 
                    value={homeStation} 
                    onChange={e => setHomeStation(e.target.value)} 
                    placeholder="如: Custom House, Royal Victoria" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">🏢 公司附近站点 (用逗号分隔)</label>
                  <input 
                    type="text" 
                    value={officeStation} 
                    onChange={e => setOfficeStation(e.target.value)} 
                    placeholder="如: Bank, Old Street, Canary Wharf" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">🌅 上班最早点 (点)</label>
                  <input type="number" min="0" max="23" value={morningStart} onChange={e => setMorningStart(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">🌅 上班最晚点 (点)</label>
                  <input type="number" min="0" max="23" value={morningEnd} onChange={e => setMorningEnd(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">🌆 下班最早点 (点)</label>
                  <input type="number" min="0" max="23" value={eveningStart} onChange={e => setEveningStart(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">🌆 下班最晚点 (点)</label>
                  <input type="number" min="0" max="23" value={eveningEnd} onChange={e => setEveningEnd(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button 
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl text-xs transition cursor-pointer"
                >
                  保存设置
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 1. Strava 数据同步模块 */}
        <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCollapseSync(!collapseSync)}
                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition cursor-pointer"
                title={collapseSync ? "展开模块" : "收起模块"}
              >
                {collapseSync ? '+' : '−'}
              </button>
              <h2 className="text-base md:text-lg font-semibold text-slate-800">Strava 数据同步</h2>
            </div>
            {!collapseSync && (
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <span className="text-center px-3 py-1.5 bg-green-50 text-green-700 font-medium text-xs rounded-xl border border-green-200">
                    ✓ 已连接
                  </span>
                ) : (
                  <a href={stravaAuthUrl} className="text-center px-3 py-1.5 bg-[#FC4C02] text-white text-xs font-medium rounded-xl hover:bg-[#E34402]">
                    连接 Strava
                  </a>
                )}
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="text-center px-3 py-1.5 bg-sky-600 text-white text-xs font-medium rounded-xl hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSyncing ? '同步中...' : '同步记录'}
                </button>
              </div>
            )}
          </div>

          {!collapseSync && (
            <p className="text-xs md:text-sm text-slate-500">点击同步将自动清洗并识别“通勤骑行”、“日常交通”与“休闲骑行”。</p>
          )}
        </div>

        {syncMsg && (
          <div className="flex items-center gap-2 text-xs md:text-sm text-sky-700 bg-sky-50 p-3.5 rounded-2xl border border-sky-100 shadow-sm">
            <span className="text-base">💡</span>
            <p className="font-medium">{syncMsg}</p>
          </div>
        )}

        {/* 2. 周度里程与节省金额双指标趋势图模块 */}
        {chartData.length > 0 && (
          <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCollapseChart(!collapseChart)}
                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition cursor-pointer"
                  title={collapseChart ? "展开模块" : "收起模块"}
                >
                  {collapseChart ? '+' : '−'}
                </button>
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-800">周度骑行里程与节省开支趋势</h2>
                  {!collapseChart && <p className="text-xs md:text-sm text-slate-400 mt-0.5">对比每周的总骑行距离 (km) 与 TfL 节省金额 (£)</p>}
                </div>
              </div>
              {!collapseChart && (
                <div className="flex items-center gap-3 text-[11px] md:text-xs font-medium">
                  <span className="flex items-center gap-1 text-sky-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span> 里程 (km)
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> 开支 (£)
                  </span>
                </div>
              )}
            </div>

            {!collapseChart && (
              <div className="w-full h-64 md:h-72 pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="shortWeek" 
                      tickLine={false} 
                      axisLine={{ stroke: '#cbd5e1' }} 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                    />
                    <YAxis 
                      yAxisId="left"
                      orientation="left"
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#0284c7', fontSize: 10 }} 
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#059669', fontSize: 10 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any, name: any): [string, string] => [
                        name === 'distance' ? `${value} km` : `£${value}`,
                        name === 'distance' ? '骑行里程' : '节省开支'
                      ]}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                    />
                    <Bar yAxisId="left" dataKey="distance" name="distance" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={12} />
                    <Bar yAxisId="right" dataKey="savings" name="savings" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* 3. 近期骑行明细列表模块 */}
        <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3 transition-all">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCollapseRides(!collapseRides)}
              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition cursor-pointer"
              title={collapseRides ? "展开模块" : "收起模块"}
            >
              {collapseRides ? '+' : '−'}
            </button>
            <h2 className="text-base md:text-lg font-semibold text-slate-800">近期骑行明细</h2>
          </div>
          
          {!collapseRides && (
            <div>
              {rides.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">暂无骑行记录，请先点击上方“同步记录”。</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rides.map((ride) => {
                    const currentCategory = ride.category || (ride.is_commute ? '日常交通' : '休闲骑行')
                    
                    return (
                      <div 
                        key={ride.id} 
                        className="py-3 flex flex-col md:flex-row md:items-center justify-between text-sm gap-2 md:gap-4 hover:bg-slate-50/80 px-2 rounded-xl transition cursor-pointer"
                        onClick={() => setSelectedRide(ride)}
                      >
                        <div className="w-full md:w-1/3 flex items-start justify-between md:justify-start gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800 text-xs md:text-sm truncate max-w-[140px] md:max-w-[200px]">{ride.name || '无标题骑行'}</p>
                              
                              {/* 🔽 优雅的下拉菜单选择器 */}
                              <select
                                value={currentCategory}
                                onClick={(e) => e.stopPropagation()} // 防止触发行的点击弹窗
                                onChange={(e) => handleSelectCategory(ride, e.target.value)}
                                className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium shrink-0 cursor-pointer border focus:outline-none appearance-none transition ${
                                  currentCategory === '通勤骑行'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : currentCategory === '日常交通'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                <option value="通勤骑行" className="bg-white text-emerald-700 font-medium">💼 通勤骑行</option>
                                <option value="日常交通" className="bg-white text-sky-700 font-medium">🚲 日常交通</option>
                                <option value="休闲骑行" className="bg-white text-slate-600 font-medium">☕ 休闲骑行</option>
                              </select>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(ride.start_date).toLocaleDateString()} · {Math.round(ride.moving_time / 60)} 分钟
                            </p>
                          </div>
                          <div className="md:hidden text-right shrink-0">
                            <span className="font-bold text-slate-700 text-sm">{(ride.distance / 1000).toFixed(1)}</span>
                            <span className="text-[11px] text-slate-500 font-medium ml-0.5">km</span>
                          </div>
                        </div>

                        <div className="w-full md:w-1/3 flex items-center gap-2 text-xs">
                          <div className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl flex-1 truncate">
                            <span className="text-slate-400 block text-[9px] mb-0.5">起点站</span>
                            <span className="font-semibold text-slate-700 truncate">{ride.start_station || '未知'}</span>
                          </div>
                          <span className="text-slate-400 font-bold">→</span>
                          <div className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl flex-1 truncate">
                            <span className="text-slate-400 block text-[9px] mb-0.5">终点站</span>
                            <span className="font-semibold text-slate-700 truncate">{ride.end_station || '未知'}</span>
                          </div>
                        </div>

                        <div className="hidden md:block w-1/6 text-right">
                          <span className="font-semibold text-slate-700">{(ride.distance / 1000).toFixed(2)} km</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 点击详情弹窗 */}
      {selectedRide && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-xs transition-all p-0 md:p-4">
          <div className="bg-white w-full md:w-[480px] rounded-t-3xl md:rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg truncate max-w-[280px]">
                  {selectedRide.name || '骑行路线详情'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(selectedRide.start_date).toLocaleDateString()} · {(selectedRide.distance / 1000).toFixed(2)} km
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