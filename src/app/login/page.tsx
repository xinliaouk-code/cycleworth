'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthErrorMessage } from '../../lib/auth-errors'
import { authClient } from '../../lib/auth/client'
import { dataClient } from '../../lib/data-client'

type AuthMode = 'sign_in' | 'sign_up' | 'forgot_password' | 'update_password' | 'verify_email'

function getRedirectUrl(path = '/login') {
  if (typeof window === 'undefined') return undefined
  return `${window.location.origin}${path}`
}

function EmailAuthForm({ onRedirecting }: { onRedirecting: () => void }) {
  const [mode, setMode] = useState<AuthMode>('sign_in')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('token')) {
      queueMicrotask(() => setMode('update_password'))
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    const trimmedEmail = email.trim()
    if (mode !== 'update_password' && !trimmedEmail) {
      setError('请输入邮箱地址。')
      return
    }
    if (!['forgot_password','verify_email'].includes(mode) && password.length < 8) {
      setError('密码至少需要 8 个字符。')
      return
    }

    setIsLoading(true)
    try {
      if (mode === 'sign_in') {
        const { data, error: authError } = await authClient.signIn.email({ email: trimmedEmail, password })
        if (authError) throw authError
        if (!data?.user?.emailVerified) {
          const result = await authClient.emailOtp.sendVerificationOtp({ email: trimmedEmail, type: 'email-verification' })
          if (result.error) throw result.error
          setMode('verify_email'); setMessage('请输入邮箱收到的验证码。')
        } else onRedirecting()
      } else if (mode === 'sign_up') {
        const result = await authClient.signUp.email({ email: trimmedEmail, password, name: trimmedEmail.split('@')[0] })
        if (result.error) throw result.error
        const sent = await authClient.emailOtp.sendVerificationOtp({ email: trimmedEmail, type: 'email-verification' })
        if (sent.error) throw sent.error
        setMode('verify_email'); setMessage('请输入邮箱验证码，验证后才能访问骑行数据。')
      } else if (mode === 'verify_email') {
        const result = await authClient.emailOtp.verifyEmail({ email: trimmedEmail, otp })
        if (result.error) throw result.error
        onRedirecting()
      } else if (mode === 'forgot_password') {
        const result = await authClient.requestPasswordReset({ email: trimmedEmail, redirectTo: getRedirectUrl('/login?reset=1') })
        if (result.error) throw result.error
        setMessage('如该邮箱已注册，将收到重置邮件。请检查收件箱和垃圾邮件。')
      } else {
        const token = new URLSearchParams(window.location.search).get('token') ?? undefined
        const result = await authClient.resetPassword({ newPassword: password, token })
        if (result.error) throw result.error
        window.history.replaceState({}, '', '/login')
        setPassword(''); setMode('sign_in'); setMessage('密码已更新，请使用新密码登录。')
      }
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
    } finally {
      setIsLoading(false)
    }
  }

  const isForgotPassword = mode === 'forgot_password'
  const isUpdatePassword = mode === 'update_password'
  const isSignUp = mode === 'sign_up'

  const copy = mode === 'verify_email' ? { title: '验证邮箱', button: '验证', loading: '验证中…' } : isUpdatePassword
    ? { title: '设置新密码', button: '更新密码', loading: '更新中…' }
    : isForgotPassword
      ? { title: '重置密码', button: '发送重置邮件', loading: '发送中…' }
      : isSignUp
        ? { title: '创建账号', button: '注册账号', loading: '注册中…' }
        : { title: '登录账号', button: '登录', loading: '登录中…' }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <h2 className="text-lg font-bold text-slate-800">{copy.title}</h2>

      {!isUpdatePassword && (
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">邮箱地址</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="你的邮箱"
            autoComplete="email"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            disabled={isLoading}
          />
        </label>
      )}

      {!isForgotPassword && mode !== 'verify_email' && (
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">{isUpdatePassword ? '新密码' : isSignUp ? '设置密码' : '密码'}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isUpdatePassword || isSignUp ? '至少 8 个字符' : '你的密码'}
            autoComplete={isSignUp || isUpdatePassword ? 'new-password' : 'current-password'}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            disabled={isLoading}
          />
        </label>
      )}

      {mode === 'verify_email' && <label className="block text-sm">邮箱验证码<input value={otp} onChange={e=>setOtp(e.target.value)} autoComplete="one-time-code" inputMode="numeric" className="mt-2 w-full rounded-xl border p-3" /></label>}
      {message && <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-medium leading-5 text-emerald-700">{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm font-medium leading-5 text-rose-700">{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? copy.loading : copy.button}
      </button>

      {!isUpdatePassword && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
          {isForgotPassword ? (
            <button type="button" onClick={() => { setMode('sign_in'); setError(''); setMessage('') }} className="font-semibold text-sky-600 hover:text-sky-700">
              返回登录
            </button>
          ) : (
            <button type="button" onClick={() => { setMode(isSignUp ? 'sign_in' : 'sign_up'); setError(''); setMessage('') }} className="font-semibold text-sky-600 hover:text-sky-700">
              {isSignUp ? '已有账号？直接登录' : '没有账号？注册账号'}
            </button>
          )}
          {!isSignUp && !isForgotPassword && (
            <button type="button" onClick={() => { setMode('forgot_password'); setError(''); setMessage('') }} className="font-semibold text-slate-500 hover:text-slate-700">
              忘记密码？
            </button>
          )}
        </div>
      )}

      {mode === 'sign_in' && (
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
          V4 首次使用请以原邮箱注册并验证。旧密码不迁移，验证后关联历史数据。
        </p>
      )}
    </form>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const redirectToDashboard = useCallback(() => {
    setIsRedirecting(true)
    router.replace('/dashboard')
  }, [router])

  useEffect(() => {
    const recoveryRequested = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('token')
    if (recoveryRequested) return

    dataClient.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectToDashboard()
    }).catch(() => { /* Verification or configuration error stays on login. */ })
  }, [redirectToDashboard])

  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-4">
      <div className="glass-surface w-full max-w-md rounded-[2rem] border p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-lg font-extrabold text-white shadow-sm">
            CW
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">登录 CycleWorth</h1>
          <p className="mt-2 text-sm text-slate-500">导入你的 Apple Health 骑行数据，量化你的财务与健康回报</p>
        </div>

        <Link
          href="/dashboard?demo=true"
          className="mb-6 flex items-center justify-between rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 p-4 transition hover:shadow-md active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-sm font-bold text-white shadow-2xs">⚡</span>
            <div className="text-left">
              <span className="block text-sm font-bold text-slate-800">免登录体验 Demo 模式</span>
              <span className="block text-xs font-medium text-slate-500">内含 40 趟真实伦敦路线轨迹、省钱率与维护看板</span>
            </div>
          </div>
          <span className="text-sm font-bold text-sky-600">进入 →</span>
        </Link>

        {isRedirecting && <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">登录成功，正在进入主页…</p>}
        <EmailAuthForm onRedirecting={redirectToDashboard} />
      </div>
    </main>
  )
}
