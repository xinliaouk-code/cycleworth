'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { dataClient } from '../../../lib/data-client'
import { commuteSettings, DEFAULT_COMMUTE_SETTINGS } from '../../../lib/health/parse'
import type { ImportSummary } from '../../../lib/health/types'

type SyncState = {
  total_imported: number
  last_failure_at: string | null
  last_failure_reason: string | null
  enabled: boolean
  writes_authorized: boolean
  last_synced_at: string | null
  last_attempt_at: string | null
  sync_from: string | null
  last_result: { dry_run: boolean; status: string; summary: ImportSummary } | null
  commute_settings: typeof DEFAULT_COMMUTE_SETTINGS | null
}

export function HealthSyncPanel({ lang }: { lang: 'en' | 'zh' }) {
  const zh = lang === 'zh'
  const [state, setState] = useState<SyncState | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [writesEnabled, setWritesEnabled] = useState(false)
  const [credential, setCredential] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [origin, setOrigin] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const sessionHeaders = async () => {
    const { data: { session } } = await dataClient.auth.getSession()
    return session ? { Authorization: `Bearer ${session.access_token}` } : null
  }

  const refresh = useCallback(async () => {
    try {
      const headers = await sessionHeaders()
      setOrigin(window.location.origin)
      setSignedIn(!!headers)
      if (!headers) return
      const res = await fetch('/api/health/credentials', { headers, cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Source status unavailable')
      setState(data.state); setWritesEnabled(data.writes_enabled); setMessage('')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Source status unavailable') }
  }, [])

  useEffect(() => {
    const { data: { subscription } } = dataClient.auth.onAuthStateChange(() => { void refresh() })
    return () => subscription.unsubscribe()
  }, [refresh])

  async function manage(action: string) {
    setBusy(true); setMessage('')
    try {
      const headers = await sessionHeaders()
      if (!headers) throw new Error(zh ? '请先登录' : 'Sign in first')
      const saved = localStorage.getItem('cw_commute_settings')
      const settings = saved ? commuteSettings(JSON.parse(saved)) : DEFAULT_COMMUTE_SETTINGS
      const res = await fetch('/api/health/credentials', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(action === 'rotate' || action === 'save_settings' ? { commute_settings: settings } : {}), ...(action === 'enable_writes' ? { confirm: true } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unable to update source')
      setState(data.state)
      if (action === 'rotate') { setCredential(data.credential); setRevealed(false) }
      if (action === 'revoke') setCredential('')
      setMessage(zh ? '设置已保存。轮换或撤销后，请更新 iPhone 的 Header。' : 'Saved. After rotation or revocation, update the iPhone header.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update source') }
    finally { setBusy(false) }
  }

  const button = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40'
  const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB') : '—'
  return <section id="apple-health-sync" className="space-y-4 rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-emerald-950">Apple Health Sync</h2><button type="button" disabled={busy} onClick={() => void refresh()} className={button}>{zh ? '刷新状态' : 'Refresh status'}</button></div>
    {!signedIn && <p className="text-sm text-slate-600"><Link href="/login" className="text-sky-700 underline">{zh ? '登录账户' : 'Sign in'}</Link> · {zh ? '登录后可创建专用同步凭证。' : 'Create a dedicated sync credential after signing in.'}</p>}
    <dl className="grid gap-4 text-sm sm:grid-cols-3">
      <div><dt className="text-xs text-slate-500">{zh ? '连接状态' : 'Connection'}</dt><dd className="mt-1 font-semibold">{state?.enabled ? (zh ? '已配置' : 'Configured') : (zh ? '未配置' : 'Not Configured')}</dd></div>
      <div><dt className="text-xs text-slate-500">{zh ? '最近成功同步' : 'Last successful sync'}</dt><dd className="mt-1">{date(state?.last_synced_at)}</dd></div>
      <div><dt className="text-xs text-slate-500">{zh ? '最后请求' : 'Last attempt'}</dt><dd className="mt-1">{date(state?.last_attempt_at)}</dd></div>
      <div><dt className="text-xs text-slate-500">{zh ? '累计导入骑行' : 'Total imported rides'}</dt><dd className="mt-1 font-semibold">{state?.total_imported ?? 0}</dd></div>
    </dl>
    {state?.last_failure_at && <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800">{zh ? '最近失败' : 'Last failure'} · {date(state.last_failure_at)} · {state.last_failure_reason}</p>}
    <p className="text-xs text-slate-600">{zh ? '默认 Dry Run；凭证就绪不代表真实设备验证通过。' : 'Dry run is the default. A ready credential does not verify your device.'} {writesEnabled ? (zh ? '服务器已允许申请写入。' : 'Server allows write activation.') : (zh ? '服务器写入开关关闭。' : 'Server writes are disabled.')}</p>
    {state?.last_result && <div className="rounded-2xl bg-white/80 p-3 text-xs text-slate-700"><p className="font-semibold">{state.last_result.dry_run ? 'Dry Run' : (zh ? '写入' : 'Write')} · {state.last_result.status}</p><p className="mt-1">{zh ? '新增' : 'New'} {state.last_result.summary.new} · {zh ? '已存在' : 'Existing'} {state.last_result.summary.exists} · {zh ? '待复核' : 'Review'} {state.last_result.summary.suspected_duplicate} · {zh ? '失败' : 'Failed'} {state.last_result.summary.failed} · {zh ? '跳过' : 'Skipped'} {state.last_result.summary.skipped}</p></div>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={!origin} onClick={() => void navigator.clipboard.writeText(`${origin}/api/health/sync`).then(()=>setMessage(zh?'同步地址已复制':'Sync URL copied')).catch(()=>setMessage(zh?'请手动复制地址':'Copy the URL below manually'))}>{zh?'复制同步地址':'Copy Sync URL'}</button>
      <Link href="/settings/health#manual-import" className={button}>{zh?'手动导入 JSON':'Manual JSON Import'}</Link>
      <button type="button" className={button} disabled={!signedIn || busy} onClick={() => void manage('rotate')}>{state?.enabled ? (zh ? '轮换凭证' : 'Rotate credential') : (zh ? '生成同步凭证' : 'Generate credential')}</button>
      <button type="button" className={button} disabled={!state?.enabled || busy} onClick={() => void manage('revoke')}>{zh ? '撤销 Token' : 'Revoke Token'}</button>
      <button type="button" className={button} disabled={!signedIn || busy} onClick={() => void manage('save_settings')}>{zh ? '保存当前通勤规则供同步使用' : 'Save current commute rules for sync'}</button>
      <button type="button" className={button} disabled={!state?.enabled || (!state?.writes_authorized && !writesEnabled) || busy} onClick={() => void manage(state?.writes_authorized ? 'disable_writes' : 'enable_writes')}>{state?.writes_authorized ? (zh ? '关闭新增骑行写入' : 'Disable new-ride writes') : (zh ? '开启新增骑行写入' : 'Enable new-ride writes')}</button>
    </div>
    {state?.commute_settings && <p className="text-xs text-slate-600">{state.commute_settings.homeStation} ↔ {state.commute_settings.officeStation} · Europe/London · {state.commute_settings.morningStart}–{state.commute_settings.morningEnd} / {state.commute_settings.eveningStart}–{state.commute_settings.eveningEnd}</p>}
    {credential && <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <label htmlFor="sync-credential" className="block text-xs font-semibold text-amber-900">{zh ? '仅本次显示；请保存到 iPhone，刷新后不可恢复。' : 'Shown once. Save it on iPhone; it cannot be recovered after refresh.'}</label>
      <input id="sync-credential" value={credential} type={revealed ? 'text' : 'password'} readOnly autoComplete="off" spellCheck={false} className="w-full rounded-lg border border-amber-200 bg-white p-2 font-mono text-xs" />
      <div className="flex gap-2"><button type="button" className={button} onClick={() => setRevealed(value => !value)}>{revealed ? (zh ? '隐藏' : 'Hide') : (zh ? '显示' : 'Show')}</button><button type="button" className={button} onClick={() => void navigator.clipboard.writeText(`Bearer ${credential}`).then(() => setMessage(zh ? '已复制 Header 值。' : 'Header value copied.')).catch(() => setMessage(zh ? '请手动复制。' : 'Copy manually.'))}>{zh ? '复制 Header 值' : 'Copy header value'}</button><button type="button" className={button} onClick={() => setCredential('')}>{zh ? '清除显示' : 'Clear display'}</button></div>
    </div>}
    <div className="space-y-1 rounded-2xl bg-white/80 p-3 text-xs text-slate-600"><p className="break-all font-mono">{origin}/api/health/sync</p><p>Authorization: Bearer &lt;credential&gt;</p><p>X-CycleWorth-Dry-Run: true</p><p>Workouts · JSON V2 · Include Route Data · Batch Requests ON</p></div>
    <p className="text-xs leading-5 text-slate-500">{zh?'启用写入后，将 Header 改为 X-CycleWorth-Dry-Run: false。历史数据也可分批上传；重试请在 Health Auto Export 中重新运行，或手动导入相同 JSON。':'After enabling writes, set X-CycleWorth-Dry-Run: false. Historical rides can be uploaded in batches. To retry, run the export again on iPhone or upload the same JSON.'}</p>
    <p role="status" className="text-sm text-slate-700">{message}</p>
  </section>
}
