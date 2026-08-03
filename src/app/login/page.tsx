'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 to-white p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            登录 CycleWorth
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            连接你的骑行数据，量化你的财务回报
          </p>
        </div>
        
        {/* Supabase 官方提供的核心登录组件 */}
        <Auth
          supabaseClient={supabase}
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