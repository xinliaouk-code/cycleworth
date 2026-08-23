'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    const redirect = () => { setIsRedirecting(true); router.replace('/dashboard') }
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) redirect() })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') redirect()
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-4">
      <div className="glass-surface w-full max-w-md p-8 rounded-[2rem] border space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 font-extrabold text-white text-lg shadow-sm">
            CW
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            登录 CycleWorth
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            连接你的 Strava 骑行数据，量化你的财务与健康回报
          </p>
        </div>

        <Link
          href="/dashboard?demo=true"
          className="flex items-center justify-between rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 p-4 transition hover:shadow-md active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white font-bold text-sm shadow-2xs">
              ⚡
            </span>
            <div className="text-left">
              <span className="block font-bold text-slate-800 text-sm">
                免登录体验 Demo 模式
              </span>
              <span className="block text-xs font-medium text-slate-500">
                内含 40 趟真实伦敦路线轨迹、省钱率与维护看板
              </span>
            </div>
          </div>
          <span className="font-bold text-sky-600 text-sm">进入 →</span>
        </Link>

        {isRedirecting && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">登录成功，正在进入主页…</p>}
        
        {/* Supabase 官方提供的核心登录组件 */}
        <Auth
          supabaseClient={supabase as unknown as SupabaseClient}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#0284c7', // 现代的亮蓝色 (Tailwind sky-600)
                  brandAccent: '#0369a1',
                },
                radii: {
                  borderRadiusButton: '0.75rem',
                  buttonBorderRadius: '0.75rem',
                  inputBorderRadius: '0.75rem',
                },
              },
            },
          }}
          providers={[]} // 我们先只使用邮箱密码登录，暂不开启第三方
          localization={{
            variables: {
              sign_in: {
                email_label: '邮箱地址',
                password_label: '密码',
                button_label: '登录',
                loading_button_label: '登录中...',
                email_input_placeholder: '你的邮箱',
                password_input_placeholder: '你的密码',
                link_text: '已经有账号了？点此登录',
              },
              sign_up: {
                email_label: '邮箱地址',
                password_label: '密码',
                button_label: '注册账号',
                loading_button_label: '注册中...',
                email_input_placeholder: '你的邮箱',
                password_input_placeholder: '设置一个密码',
                link_text: '没有账号？点此注册',
              },
            },
          }}
        />
      </div>
    </main>
  )
}
