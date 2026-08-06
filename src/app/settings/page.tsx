'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { defaultMaintenanceTasks, maintenanceName, type MaintenanceTask } from '../../lib/maintenance'
import { DEFAULT_TFL_FARE_SETTINGS, parseTfLFareSettings, type FareKey, type TfLFareSettings } from '../../lib/tfl/fares'
import { LanguageSwitcher, useLanguage } from '../../components/LanguageProvider'

const BROMPTON_GUIDE = 'https://www.brompton.com/stories/guides/folding-bike-maintenance-guide'
const fareRows: Array<[FareKey, string]> = [['z1_1', 'Zone 1 only'], ['z1_2', 'Zones 1–2'], ['z1_3', 'Zones 1–3'], ['z1_4', 'Zones 1–4'], ['z1_5', 'Zones 1–5'], ['z1_6', 'Zones 1–6'], ['outside_1', 'One zone outside Zone 1'], ['outside_2', 'Two zones outside Zone 1'], ['outside_3', 'Three zones outside Zone 1'], ['outside_4', 'Four zones outside Zone 1'], ['z2_6', 'Zones 2–6']]

function SettingCard({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-100 bg-white shadow-sm"><button onClick={onToggle} className="flex w-full items-center justify-between p-5 text-left"><h2 className="font-semibold text-slate-800">{title}</h2><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{open ? '−' : '+'}</span></button>{open && <div className="border-t border-slate-100 p-5">{children}</div>}</section>
}

export default function SettingsPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [settings, setSettings] = useState<TfLFareSettings>(DEFAULT_TFL_FARE_SETTINGS)
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState({ rules: true, fares: false, maintenance: false, info: false })
  const text = lang === 'zh' ? {
    title: '\u8bbe\u7f6e', back: '\u8fd4\u56de\u4eea\u8868\u76d8', rules: '\u8282\u7701\u89c4\u5219', fares: 'TfL \u5355\u7a0b\u7968\u4ef7', maintenance: '\u81ea\u884c\u8f66\u4fdd\u517b\u5468\u671f', info: '\u7968\u4ef7\u6570\u636e\u8bf4\u660e', all: '\u901a\u52e4\u9a91\u884c\u4e0e\u65e5\u5e38\u4ea4\u901a\u90fd\u8ba1\u5165\u8282\u7701', commute: '\u4ec5\u901a\u52e4\u9a91\u884c\u8ba1\u5165\u8282\u7701', fallback: '\u672a\u80fd\u8bc6\u522b\u8def\u7ebf\u7684\u56de\u9000\u7968\u4ef7 (£)', peak: '\u9ad8\u5cf0', offPeak: '\u975e\u9ad8\u5cf0', save: '\u4fdd\u5b58\u5230\u6240\u6709\u8bbe\u5907', reset: '\u6062\u590d 2026 \u5b98\u65b9\u9ed8\u8ba4\u503c', saved: '\u5df2\u4fdd\u5b58', failed: '\u4fdd\u5b58\u5931\u8d25', effective: '\u751f\u6548\u65e5\u671f', source: '\u6570\u636e\u6765\u6e90', version: '\u7248\u672c', distance: '\u91cc\u7a0b\u5468\u671f (km)', days: '\u65f6\u95f4\u5468\u671f (\u5929)', reference: 'Brompton \u5b98\u65b9\u4fdd\u517b\u53c2\u8003', referenceNote: '\u63a8\u8350\u503c\u9762\u5411 London \u901a\u52e4\u4f7f\u7528\uff0c\u53ef\u4f9d\u8def\u51b5\u4e0e\u9a91\u884c\u9891\u7387\u8c03\u6574\u3002', advanced: '\u67e5\u770b\u4fdd\u517b\u8be6\u60c5\u4e0e\u5386\u53f2',
  } : {
    title: 'Settings', back: 'Back to dashboard', rules: 'Savings rules', fares: 'TfL single fares', maintenance: 'Bike maintenance intervals', info: 'Fare data information', all: 'Count both Commute and Everyday transport as savings', commute: 'Count Commute only as savings', fallback: 'Fallback fare for unmapped routes (£)', peak: 'Peak', offPeak: 'Off-peak', save: 'Save across devices', reset: 'Restore 2026 defaults', saved: 'Saved', failed: 'Could not save', effective: 'Effective date', source: 'Source', version: 'Version', distance: 'Distance interval (km)', days: 'Time interval (days)', reference: 'Brompton official maintenance guide', referenceNote: 'Recommended values suit London commuting; adjust them for your riding conditions and frequency.', advanced: 'View maintenance details and history',
  }

  useEffect(() => { async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.push('/login'); return }
    const id = session.user.id; setUserId(id)
    const [{ data: saved }, { data: rides }] = await Promise.all([
      supabase.from('settings').select('tfl_fare_settings').eq('id', id).maybeSingle(),
      supabase.from('rides').select('distance').eq('user_id', id),
    ])
    if (saved?.tfl_fare_settings) setSettings(parseTfLFareSettings(saved.tfl_fare_settings))
    const odometerKm = (rides ?? []).reduce((sum, ride) => sum + (Number(ride.distance) || 0), 0) / 1000
    await supabase.from('bike_maintenance_tasks').upsert(defaultMaintenanceTasks.map(([task_type, display_name, distance_interval_km, time_interval_days]) => ({ user_id: id, task_type, display_name, distance_interval_km, time_interval_days, last_completed_odometer_km: odometerKm })), { onConflict: 'user_id,task_type', ignoreDuplicates: true })
    const { data: tasks } = await supabase.from('bike_maintenance_tasks').select('*').eq('user_id', id).order('display_name')
    setMaintenanceTasks((tasks ?? []) as MaintenanceTask[])
  }; load() }, [router])

  function updateFare(period: 'peak' | 'offPeak', key: FareKey, value: string) { setSettings(current => ({ ...current, [period]: { ...current[period], [key]: Math.max(0, Number.parseFloat(value) || 0) } })) }
  function updateMaintenance(id: string, field: 'distance_interval_km' | 'time_interval_days', value: string) { setMaintenanceTasks(current => current.map(task => task.id === id ? { ...task, [field]: value.trim() ? Math.max(0, Number(value) || 0) : null } : task)) }
  async function save() {
    if (!userId) { setStatus(lang === 'zh' ? '\u6b63\u5728\u52a0\u8f7d\u767b\u5f55\u72b6\u6001\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' : 'Your sign-in is still loading. Please try again in a moment.'); return }
    const [{ error: fareError }, ...taskResults] = await Promise.all([
      supabase.from('settings').upsert({ id: userId, tfl_fare_settings: settings }, { onConflict: 'id' }),
      ...maintenanceTasks.map(task => supabase.from('bike_maintenance_tasks').update({ distance_interval_km: task.distance_interval_km, time_interval_days: task.time_interval_days }).eq('id', task.id)),
    ])
    const maintenanceError = taskResults.find(result => result.error)?.error
    const error = fareError || maintenanceError
    setStatus(error ? `${text.failed}: ${error.message}` : text.saved)
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-6 md:p-10"><div className="mx-auto max-w-3xl space-y-4"><header className="mb-6 flex items-center justify-between"><div><Link href="/dashboard" className="text-sm font-medium text-sky-600">← {text.back}</Link><h1 className="mt-3 text-2xl font-bold text-slate-800">{text.title}</h1></div><LanguageSwitcher /></header><SettingCard title={text.rules} open={open.rules} onToggle={() => setOpen(current => ({ ...current, rules: !current.rules }))}><div className="space-y-3"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input type="radio" checked={settings.savingsMode === 'all_eligible'} onChange={() => setSettings(current => ({ ...current, savingsMode: 'all_eligible' }))} />{text.all}</label><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input type="radio" checked={settings.savingsMode === 'commute_only'} onChange={() => setSettings(current => ({ ...current, savingsMode: 'commute_only' }))} />{text.commute}</label></div></SettingCard><SettingCard title={text.fares} open={open.fares} onToggle={() => setOpen(current => ({ ...current, fares: !current.fares }))}><label className="block max-w-xs text-sm font-medium text-slate-700">{text.fallback}<input type="number" min="0" step="0.1" value={settings.fallbackFare} onChange={event => setSettings(current => ({ ...current, fallbackFare: Math.max(0, Number.parseFloat(event.target.value) || 0) }))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase text-slate-400"><th className="pb-3">Zones</th><th className="pb-3">{text.peak} (£)</th><th className="pb-3">{text.offPeak} (£)</th></tr></thead><tbody>{fareRows.map(([key, label]) => <tr key={key} className="border-b border-slate-50"><td className="py-3 text-slate-700">{label}</td><td className="py-3"><input type="number" min="0" step="0.1" value={settings.peak[key]} onChange={event => updateFare('peak', key, event.target.value)} className="w-24 rounded-lg border border-slate-200 px-2 py-1.5" /></td><td className="py-3"><input type="number" min="0" step="0.1" value={settings.offPeak[key]} onChange={event => updateFare('offPeak', key, event.target.value)} className="w-24 rounded-lg border border-slate-200 px-2 py-1.5" /></td></tr>)}</tbody></table></div><button onClick={() => setSettings(DEFAULT_TFL_FARE_SETTINGS)} className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">{text.reset}</button></SettingCard><SettingCard title={text.maintenance} open={open.maintenance} onToggle={() => setOpen(current => ({ ...current, maintenance: !current.maintenance }))}><p className="text-sm text-slate-500">{text.referenceNote}</p><a href={BROMPTON_GUIDE} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-sky-600 underline underline-offset-2">{text.reference} ↗</a><div className="mt-4 space-y-3">{maintenanceTasks.map(task => <div key={task.id} className="rounded-xl border border-slate-100 p-3"><p className="mb-2 text-sm font-semibold text-slate-700">{maintenanceName(task, lang)}</p><div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-500">{text.distance}<input type="number" min="0" value={task.distance_interval_km ?? ''} onChange={event => updateMaintenance(task.id, 'distance_interval_km', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700" /></label><label className="text-xs text-slate-500">{text.days}<input type="number" min="0" value={task.time_interval_days ?? ''} onChange={event => updateMaintenance(task.id, 'time_interval_days', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700" /></label></div></div>)}</div><Link href="/maintenance" className="mt-4 inline-block text-sm font-semibold text-sky-600">{text.advanced} →</Link></SettingCard><SettingCard title={text.info} open={open.info} onToggle={() => setOpen(current => ({ ...current, info: !current.info }))}><dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm"><dt className="text-slate-400">{text.effective}</dt><dd className="font-medium text-slate-700">1 March 2026</dd><dt className="text-slate-400">{text.source}</dt><dd className="font-medium text-slate-700">London City Hall / TfL 2026 proposed Tube fares</dd><dt className="text-slate-400">{text.version}</dt><dd className="font-medium text-slate-700">2026.1</dd></dl></SettingCard><div className="flex items-center gap-3 pt-2"><button onClick={save} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white">{text.save}</button>{status && <span className="text-sm font-medium text-emerald-600">{status}</span>}</div></div></main>
}
