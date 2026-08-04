'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Google Polyline 解码函数
function decodePolyline(encoded: string): [number, number][] {
  let points: [number, number][] = []
  let index = 0, len = encoded.length
  let lat = 0, lng = 0
  while (index < len) {
    let b, shift = 0, result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lat += dlat
    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lng += dlng
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

// 真实地图缩略图组件
function RouteMapPreview({ polyline }: { polyline: string }) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || !polyline) return

    // 初始化地图实例
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      })

      // 加载高颜值精美浅色地图底图 (CartoDB Voyager)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map)

      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current
    const coords = decodePolyline(polyline)

    if (coords.length > 0) {
      // 清理旧的轨迹图层
      map.eachLayer((layer) => {
        if (layer instanceof L.Polyline) {
          map.removeLayer(layer)
        }
      })

      // 绘制骑行轨迹路线
      const polylineLayer = L.polyline(coords, {
        color: '#0284c7', // 天蓝色
        weight: 4.5,
        opacity: 0.9,
      }).addTo(map)

      // 自动缩放并居中适配路线
      map.fitBounds(polylineLayer.getBounds(), { padding: [15, 15] })
    }

    // 解决容器大小调整问题
    setTimeout(() => {
      map.invalidateSize()
    }, 50)

  }, [polyline])

  // 组件卸载时销毁地图
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  if (!polyline) {
    return <div className="text-xs text-slate-400 flex items-center justify-center h-36 bg-slate-100 rounded-2xl">暂无轨迹数据</div>
  }

  return (
    <div className="w-[260px] h-[160px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-lg text-[10px] font-semibold text-slate-700 shadow-sm z-[1000] border border-slate-100">
        🗺️ 真实路线地图
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [rides, setRides] = useState<any[]>([])
  const [syncMsg, setSyncMsg] = useState('')
  const [hoveredRide, setHoveredRide] = useState<any>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
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
      setRides(data)
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
        setSyncMsg(`成功同步最新记录，共获取 ${result.count} 条！`)
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
    <main 
      className="min-h-screen bg-slate-50 p-8 relative"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <div className="max-w-4xl mx-auto mt-8 space-y-6">
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Strava 数据同步</h2>
            <p className="text-sm text-slate-500 mt-1">点击同步以获取最新的云端骑行记录。</p>
          </div>
          
          <div className="flex items-center gap-3">
            {isConnected ? (
              <span className="px-4 py-2 bg-green-50 text-green-700 font-medium text-sm rounded-xl border border-green-200">
                ✓ 已连接
              </span>
            ) : (
              <a href={stravaAuthUrl} className="px-5 py-2 bg-[#FC4C02] text-white text-sm font-medium rounded-xl hover:bg-[#E34402]">
                连接 Strava
              </a>
            )}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-5 py-2 bg-sky-600 text-white text-sm font-medium rounded-xl hover:bg-sky-700 disabled:opacity-50"
            >
              {isSyncing ? '同步中...' : '同步记录'}
            </button>
          </div>
        </div>

        {syncMsg && (
          <p className="text-sm text-sky-600 bg-sky-50 p-3 rounded-xl border border-sky-100">
            {syncMsg}
          </p>
        )}

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">近期骑行明细</h2>
          
          {rides.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">暂无骑行记录，请先点击上方“同步记录”。</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {rides.map((ride) => (
                <div 
                  key={ride.id} 
                  className="py-3.5 flex items-center justify-between text-sm gap-4 hover:bg-slate-50/80 px-3 rounded-xl transition cursor-default"
                  onMouseEnter={() => setHoveredRide(ride)}
                  onMouseLeave={() => setHoveredRide(null)}
                >
                  <div className="w-1/3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 truncate">{ride.name || '无标题骑行'}</p>
                      <button
                        onClick={() => handleToggleCommute(ride.id, ride.is_commute)}
                        title="点击切换 通勤 / 休闲"
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium shrink-0 transition cursor-pointer border ${
                          ride.is_commute 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {ride.is_commute ? '上班通勤' : '休闲骑行'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(ride.start_date).toLocaleDateString()} · {Math.round(ride.moving_time / 60)} 分钟
                    </p>
                  </div>

                  <div className="w-1/3 flex items-center gap-2 text-xs">
                    <div className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl flex-1 truncate">
                      <span className="text-slate-400 block text-[10px]">起点站</span>
                      <span className="font-semibold text-slate-700 truncate">{ride.start_station || '未知'}</span>
                    </div>
                    <span className="text-slate-400 font-bold">→</span>
                    <div className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl flex-1 truncate">
                      <span className="text-slate-400 block text-[10px]">终点站</span>
                      <span className="font-semibold text-slate-700 truncate">{ride.end_station || '未知'}</span>
                    </div>
                  </div>

                  <div className="w-1/6 text-right">
                    <span className="font-semibold text-slate-700">{(ride.distance / 1000).toFixed(2)} km</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 真实地图路线预览悬浮窗 */}
      {hoveredRide && (
        <div 
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-3 transition-all duration-75 ease-out"
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y - 10}px` }}
        >
          <RouteMapPreview polyline={hoveredRide.summary_polyline} />
        </div>
      )}
    </main>
  )
}