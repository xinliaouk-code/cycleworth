'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { DEFAULT_TFL_FARE_SETTINGS, parseTfLFareSettings, type FareKey, type TfLFareSettings } from '../../lib/tfl/fares'
import { LanguageSwitcher, useLanguage } from '../../components/LanguageProvider'

const fareRows: Array<[FareKey, string]> = [
  ['z1_1', 'Zone 1 only'], ['z1_2', 'Zones 1–2'], ['z1_3', 'Zones 1–3'], ['z1_4', 'Zones 1–4'], ['z1_5', 'Zones 1–5'], ['z1_6', 'Zones 1–6'], ['outside_1', 'One zone outside Zone 1'], ['outside_2', 'Two zones outside Zone 1'], ['outside_3', 'Three zones outside Zone 1'], ['outside_4', 'Four zones outside Zone 1'], ['z2_6', 'Zones 2–6'],
]

export default function SettingsPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [settings, setSettings] = useState<TfLFareSettings>(DEFAULT_TFL_FARE_SETTINGS)
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const text = lang === 'zh' ? { title: '\u8bbe\u7f6e', back: '\u8fd4\u56de\u4eea\u8868\u76d8', subtitle: 'TfL \u5355\u7a0b\u7968\u4ef7\uff08\u8de8\u8bbe\u5907\u540c\u6b65\uff09', fallback: '\u672a\u80fd\u8bc6\u522b\u8def\u7ebf\u7684\u56de\u9000\u7968\u4ef7\uff08£\uff09', peak: '\u9ad8\u5cf0', offPeak: '\u975e\u9ad8\u5cf0', save: '\u4fdd\u5b58\u5230\u6240\u6709\u8bbe\u5907', reset: '\u6062\u590d 2026 \u5b98\u65b9\u9ed8\u8ba4\u503c', saved: '\u5df2\u4fdd\u5b58', failed: '\u4fdd\u5b58\u5931\u8d25' } : { title: 'Settings', back: 'Back to dashboard', subtitle: 'TfL single-fare matrix (synced across devices)', fallback: 'Fallback fare for unmapped routes (£)', peak: 'Peak', offPeak: 'Off-peak', save: 'Save across devices', reset: 'Restore 2026 defaults', saved: 'Saved', failed: 'Could not save' }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/login'); return }
      setUserId(session.user.id)
      const { data } = await supabase.from('settings').select('tfl_fare_settings').eq('id', session.user.id).maybeSingle()
      if (data?.tfl_fare_settings) setSettings(parseTfLFareSettings(data.tfl_fare_settings))
    }
    load()
  }, [router])

  function updateFare(period: 'peak' | 'offPeak', key: FareKey, value: string) {
    setSettings(current => ({ ...current, [period]: { ...current[period], [key]: Math.max(0, Number.parseFloat(value) || 0) } }))
  }

  async function save() {
    if (!userId) { setStatus(lang === 'zh' ? '\u6b63\u5728\u52a0\u8f7d\u767b\u5f55\u72b6\u6001\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' : 'Your sign-in is still loading. Please try again in a moment.'); return }
    setStatus('')
    const { error } = await supabase.from('settings').upsert({ id: userId, tfl_fare_settings: settings }, { onConflict: 'id' })
    setStatus(error ? `${text.failed}: ${error.message}` : text.saved)
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-6 md:p-10"><div className="mx-auto max-w-3xl space-y-6"><header className="flex items-center justify-between"><div><Link href="/dashboard" className="text-sm font-medium text-sky-600 hover:text-sky-700">← {text.back}</Link><h1 className="mt-3 text-2xl font-bold text-slate-800">{text.title}</h1><p className="mt-1 text-sm text-slate-500">{text.subtitle}</p></div><LanguageSwitcher /></header><section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7"><label className="block max-w-xs text-sm font-medium text-slate-700">{text.fallback}<input type="number" min="0" step="0.1" value={settings.fallbackFare} onChange={event => setSettings(current => ({ ...current, fallbackFare: Math.max(0, Number.parseFloat(event.target.value) || 0) }))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none" /></label><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 font-medium">Zones</th><th className="pb-3 font-medium">{text.peak} (£)</th><th className="pb-3 font-medium">{text.offPeak} (£)</th></tr></thead><tbody>{fareRows.map(([key, label]) => <tr key={key} className="border-b border-slate-50"><td className="py-3 text-slate-700">{label}</td><td className="py-3 pr-3"><input type="number" min="0" step="0.1" value={settings.peak[key]} onChange={event => updateFare('peak', key, event.target.value)} className="w-24 rounded-lg border border-slate-200 px-2 py-1.5" /></td><td className="py-3"><input type="number" min="0" step="0.1" value={settings.offPeak[key]} onChange={event => updateFare('offPeak', key, event.target.value)} className="w-24 rounded-lg border border-slate-200 px-2 py-1.5" /></td></tr>)}</tbody></table></div><div className="flex flex-wrap items-center gap-3"><button onClick={save} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">{text.save}</button><button onClick={() => setSettings(DEFAULT_TFL_FARE_SETTINGS)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">{text.reset}</button>{status && <span className="text-sm font-medium text-emerald-600">{status}</span>}</div></section></div></main>
}
