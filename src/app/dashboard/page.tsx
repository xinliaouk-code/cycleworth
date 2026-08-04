'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation' // 新增路由功能
import { supabase } from '../../lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [rides, setRides] = useState<any[]>([])
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // 核心修复 1：如果没登录，直接打回登录页
        router.push('/login')
        return
      }
      
      setUser(user)

      // 核心修复 2：检查网址里是否有 Strava 带回来的授权码 code
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      
      if (code) {
        await handleExchangeCode(code, user.id)
      } else {
        checkExistingConnection(user.id)
        fetchRides(user.id)
      }
    }
    init()
  }, [router])

  // 新增：自动用 code 换取真正 token 的逻辑
  async function handleExchangeCode(code: string, userId: string) {
    setSyncMsg('正在处理 Strava 授权...')
    try {
      // 这里调用了你写好的 exchange 接口
      const res = await fetch('/api/strava/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId })
      })
      
      if (res.ok) {
        setIsConnected(true)
        setSyncMsg('✓ Strava 连接成功！')
        // 清理掉网址上的 code，防止刷新页面时重复请求
        window.history.replaceState({}, document.title, '/dashboard')
        fetchRides(userId)
      } else {
        setSyncMsg('授权处理失败，请重试')
      }
    } catch (error) {
      setSyncMsg('请求异常，请检查网络')
    }
  }

  async function checkExistingConnection(userId: string) {
    const { data } = await supabase
      .from('strava_connections')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    if (data) setIsConnected(true)
  }

  async function fetchRides(userId: string) {
    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })

    if (data) setRides(data)
  }

  async function handleSync() {
    if (!user) return
    setIsSyncing(true)
    setSyncMsg('正在从 Strava 同步骑行数据...')

    try {
      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const result = await res.json()

      if (result.success) {
        setSyncMsg(`成功同步 ${result.count} 条记录！`)
        fetchRides(user.id)
      } else {
        setSyncMsg('同步失败：' + (result.error || '未知错误'))
      }
    } catch (err) {
      setSyncMsg('同步请求发起失败')
    } finally {
      setIsSyncing(false)
    }
  }

  const DOMAIN = "https://cycleworth.vercel.app"
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  const redirectUri = `${DOMAIN}/api/strava/callback`
  // 核心修复 3：去掉了 /mobile，变回最稳定的标准网页端授权
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&approval_prompt=auto&scope=activity:read_all`

  const totalDistanceKm = (rides.reduce((acc, r) => acc + (r.distance || 0), 0) / 1000).toFixed(1)
  const estimatedSavings = (rides.length * 3.90).toFixed(2)

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto mt-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">
            CycleWorth 个人财务仪表盘
          </h1>
          <p className="text-slate-500">
            当前登录: {user?.email || '加载中...'}
          </p>
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
            <p className="text-sm font-medium text-sky-600">已节省交通开支 (TfL)</p>
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
              disabled={isSyncing || !isConnected} // 没连接时也不允许瞎点同步
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
                <div key={ride.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{ride.name || '无标题骑行'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(ride.start_date).toLocaleDateString()} · {Math.round(ride.moving_time / 60)} 分钟
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-700">{(ride.distance / 1000).toFixed(2)} km</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}