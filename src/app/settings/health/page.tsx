'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { dataClient } from '../../../lib/data-client'
import { parseWorkouts, commuteSettings, DEFAULT_COMMUTE_SETTINGS } from '../../../lib/health/parse'
import { summarize, type ImportItem } from '../../../lib/health/types'
import { MAX_BODY_BYTES } from '../../../lib/health/http'
import { useLanguage, LanguageSwitcher } from '../../../components/LanguageProvider'
import { HealthSyncPanel } from './HealthSyncPanel'

const RideMap = dynamic(() => import('../../../components/RideMap'), { ssr: false })

export default function HealthSettings() {
  const { lang } = useLanguage()
  const zh = lang === 'zh'
  const [payload, setPayload] = useState<unknown>(null)
  const [items, setItems] = useState<ImportItem[]>([])
  const [routes, setRoutes] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [resultMode, setResultMode] = useState<'local' | 'preview' | 'imported'>('local')
  const databasePreview = resultMode === 'preview'
  const [fileName, setFileName] = useState('')
  const [historyWritesEnabled, setHistoryWritesEnabled] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const summary = summarize(items)
  const text = zh ? {
    title: 'Apple Health', subtitle: '从 Health Auto Export 导入骑行，共用现有路线、通勤和统计。',
    file: '选择 Workout JSON V2 文件', preview: '数据库 Dry Run', local: '本地格式检查', back: '返回设置',
    noWrite: '历史导入当前仅供预览，不会写入骑行。', login: '请先登录，再查询已有骑行和疑似重复。',
    localDone: '格式检查完成；尚未查询数据库，新增数量仅表示格式有效。', dbDone: '数据库预览完成，未写入骑行。',
    new: '新增', exists: '已存在', suspected_duplicate: '疑似重复', failed: '失败', skipped: '跳过',
    review: '疑似重复暂不导入，不影响现有骑行记录或手动分类。',
  } : {
    title: 'Apple Health', subtitle: 'Import Health Auto Export rides into your existing routes, commute analysis and statistics.',
    file: 'Choose Workout JSON V2 file', preview: 'Database dry run', local: 'Local format check', back: 'Back to settings',
    noWrite: 'History imports are preview-only. No rides will be written.', login: 'Sign in to check existing rides and possible duplicates.',
    localDone: 'Format check complete. Database not queried; new means valid format only.', dbDone: 'Database preview complete. No rides written.',
    new: 'New', exists: 'Existing', suspected_duplicate: 'Possible duplicates', failed: 'Failed', skipped: 'Skipped',
    review: 'Possible duplicates are held. Existing rides and manual classifications are preserved.',
  }

  function rules() {
    const saved = localStorage.getItem('cw_commute_settings')
    return saved ? commuteSettings(JSON.parse(saved)) : DEFAULT_COMMUTE_SETTINGS
  }

  async function loadFile(file: File | undefined) {
    setPayload(null); setItems([]); setRoutes([]); setResultMode('local'); setFileName(''); setMessage(''); setHistoryWritesEnabled(false); setConfirmed(false)
    if (!file) return
    if (file.size > MAX_BODY_BYTES) { setMessage(zh ? '文件超过 4 MiB，请缩短导出时间范围。' : 'File exceeds 4 MiB. Shorten the export date range.'); return }
    try {
      const data: unknown = JSON.parse(await file.text())
      const parsed = parseWorkouts(data, rules())
      setPayload(data); setFileName(file.name); setItems(parsed.items)
      setRoutes(parsed.rides.map(r => r.ride.summary_polyline).filter((r): r is string => !!r).slice(0, 3))
      setMessage(text.localDone)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Invalid JSON') }
  }

  async function preview(write = false) {
    if (write && (!databasePreview || !historyWritesEnabled || !confirmed)) return
    setBusy(true); setResultMode('local')
    try {
      const { data: { session } } = await dataClient.auth.getSession()
      if (!session) { setMessage(text.login); return }
      const res = await fetch('/api/health/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(write ? { 'X-CycleWorth-Confirm-History': 'import-new-only' } : {}) },
        body: JSON.stringify({ ...(payload as object), commute_settings: rules(), dry_run: !write }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Preview unavailable')
      setItems(data.items); setResultMode(write ? 'imported' : 'preview'); setHistoryWritesEnabled(data.history_writes_enabled); setConfirmed(false)
      setMessage(write ? (zh ? `已新增 ${data.imported} 条；已有和疑似重复记录均未覆盖。` : `Imported ${data.imported} new rides. Existing rides and possible duplicates were preserved.`) : text.dbDone)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Preview unavailable') }
    finally { setBusy(false) }
  }

  return <main id="manual-import" className="mx-auto max-w-4xl space-y-6 px-5 py-8">
    <div className="flex items-center justify-between"><Link href="/settings" className="text-sm text-sky-700">← {text.back}</Link><LanguageSwitcher /></div>
    <header><p className="text-xs font-semibold uppercase tracking-widest text-sky-600">CycleWorth · Data sources</p><h1 className="mt-2 text-3xl font-bold text-slate-900">{text.title}</h1><p className="mt-2 text-slate-600">{text.subtitle}</p></header>
    <HealthSyncPanel lang={lang} />
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{zh ? '历史骑行预览' : 'History preview'}</h2>
      <p className="text-sm text-slate-600">{historyWritesEnabled ? (zh ? '服务器已单独开放历史写入。请先预览并明确确认新增导入。' : 'Server has separately enabled history writes. Preview and explicitly confirm before importing new rides.') : text.noWrite}</p>
      <label className="block text-sm font-medium" htmlFor="health-file">{text.file}</label>
      <input id="health-file" type="file" accept=".json,application/json" disabled={busy} onChange={event => void loadFile(event.target.files?.[0])} className="block w-full rounded-xl border border-slate-200 p-3 text-sm" />
      {fileName && <p className="break-all text-xs text-slate-500">{fileName} · {databasePreview ? text.preview : resultMode === 'imported' ? (zh ? '已导入' : 'Imported') : text.local}</p>}
      <button type="button" disabled={!payload || busy} onClick={() => void preview()} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? '…' : text.preview}</button>
      {historyWritesEnabled && databasePreview && summary.new > 0 && <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{zh ? `我已核对预览，确认仅新增 ${summary.new} 条骑行，不覆盖已有或疑似重复。` : `I reviewed the preview and confirm importing only ${summary.new} new rides, preserving existing rides and possible duplicates.`}</label>
        <button type="button" disabled={!confirmed || busy} onClick={() => void preview(true)} className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{zh ? '确认新增历史骑行' : 'Confirm history import'}</button>
      </div>}
      <p role="status" className="text-sm text-slate-700">{message}</p>
      {items.length > 0 && <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{(['new', 'exists', 'suspected_duplicate', 'failed', 'skipped'] as const).map(key => <div key={key} className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{text[key]}</p><p className="mt-1 text-2xl font-bold text-slate-800">{summary[key]}</p></div>)}</div>
        <p className="text-xs text-slate-500">{text.review}</p>
        <div className="max-h-80 overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="py-2">#</th><th>{zh ? '结果' : 'Result'}</th><th>{zh ? '详情' : 'Details'}</th></tr></thead><tbody>{items.map(item => <tr key={item.index} className="border-b border-slate-100"><td className="py-3 pr-3">{item.index + 1}</td><td className="pr-3">{text[item.status]}</td><td className="max-w-64 break-words py-3">{item.message}{item.warnings?.join(' · ')}{item.candidate_ids?.map(id => <span key={id} className="block font-mono">{id}</span>)}</td></tr>)}</tbody></table></div>
      </>}
    </section>
    {routes.length > 0 && <section className="grid gap-4 sm:grid-cols-2">{routes.map((polyline, i) => <div className="h-56" key={i}><RideMap polyline={polyline} /></div>)}</section>}
    <p className="text-xs text-slate-500">READY FOR REAL-DATA REVIEW · {zh ? '真实 iPhone 数据尚待验证。' : 'Real iPhone data has not been verified.'}</p>
  </main>
}
