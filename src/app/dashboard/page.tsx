'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase'

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
  
  // 统一的点击弹窗状态（电脑端与手机端通用）
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)

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

  async function handleToggleCommute(rideId: string, currentVal: boolean) {
    const newVal = !currentVal
    setRides(rides.map(r => r.id === rideId ? { ...r, is_commute: newVal } : r))
    const { error } = await supabase
      .from('rides')
      .update({ is_commute: newVal })
      .eq('id', rideId)

    if (error) {
      console.error('更新通勤状态失败:', error.message)
      if (user) fetchRides(user.id)
    }
  }

async function handleSyncInternal(userId: string) {
    try {
      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const result = await res.json()

      if (result.success) {
        // 👉 把这里改成你截图里的新提示信息
        setSyncMsg(`同步完成！已成功获取最新记录，并自动识别 Custom House / Royal Victoria ⇋ Bank / Old Street 往返通勤路线。`)
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 relative">
      <div className="max-w-4xl mx-auto mt-4 md:mt-8 space-y-6">
        <div className="flex items-center justify-between">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-400">总骑行次数</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{rides.length} <span className="text-sm font-normal text-slate-500">次</span></p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-400">总骑行距离</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{totalDistanceKm} <span className="text-sm font-normal text-slate-500">km</span></p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 bg-gradient-to-br from-sky-50 to-white">
            <p className="text-sm font-medium text-sky-600">已节省交通开支 (TfL · 仅通勤)</p>
            <p className="text-3xl font-bold text-sky-700 mt-2">£{estimatedSavings}</p>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Strava 数据同步</h2>
            <p className="text-sm text-slate-500 mt-1">点击同步以获取最新的云端骑行记录。</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {isConnected ? (
              <span className="flex-1 md:flex-none text-center px-4 py-2.5 bg-green-50 text-green-700 font-medium text-sm rounded-xl border border-green-200">
                ✓ 已连接
              </span>
            ) : (
              <a href={stravaAuthUrl} className="flex-1 md:flex-none text-center px-5 py-2.5 bg-[#FC4C02] text-white text-sm font-medium rounded-xl hover:bg-[#E34402]">
                连接 Strava
              </a>
            )}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex-1 md:flex-none text-center px-5 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 disabled:opacity-50"
            >
              {isSyncing ? '同步中...' : '同步记录'}
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className="flex items-center gap-2 text-sm text-sky-700 bg-sky-50 p-4 rounded-2xl border border-sky-100 shadow-sm animate-in fade-in duration-200">
            <span className="text-lg">💡</span>
            <p className="font-medium">{syncMsg}</p>
          </div>
        )}

        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">近期骑行明细</h2>
          
          {rides.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">暂无骑行记录，请先点击上方“同步记录”。</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {rides.map((ride) => (
                <div 
                  key={ride.id} 
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between text-sm gap-4 hover:bg-slate-50/80 px-2 md:px-3 rounded-xl transition cursor-pointer"
                  onClick={() => setSelectedRide(ride)}
                >
                  <div className="w-full md:w-1/3 flex items-start justify-between md:justify-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 truncate max-w-[140px] md:max-w-[200px]">{ride.name || '无标题骑行'}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleCommute(ride.id, ride.is_commute)
                          }}
                          title="点击切换 通勤 / 休闲"
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 transition cursor-pointer border ${
                            ride.is_commute 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {ride.is_commute ? '上班通勤' : '休闲骑行'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(ride.start_date).toLocaleDateString()} · {Math.round(ride.moving_time / 60)} 分钟
                      </p>
                    </div>
                    <div className="md:hidden text-right shrink-0">
                      <span className="font-bold text-slate-700 text-base">{(ride.distance / 1000).toFixed(1)}</span>
                      <span className="text-xs text-slate-500 font-medium ml-0.5">km</span>
                    </div>
                  </div>

                  <div className="w-full md:w-1/3 flex items-center gap-2 text-xs">
                    <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl flex-1 truncate">
                      <span className="text-slate-400 block text-[10px] mb-0.5">起点站</span>
                      <span className="font-semibold text-slate-700 truncate">{ride.start_station || '未知'}</span>
                    </div>
                    <span className="text-slate-400 font-bold">→</span>
                    <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl flex-1 truncate">
                      <span className="text-slate-400 block text-[10px] mb-0.5">终点站</span>
                      <span className="font-semibold text-slate-700 truncate">{ride.end_station || '未知'}</span>
                    </div>
                  </div>

                  <div className="hidden md:block w-1/6 text-right">
                    <span className="font-semibold text-slate-700">{(ride.distance / 1000).toFixed(2)} km</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 统一的点击详情弹窗（电脑端与手机端通用） */}
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