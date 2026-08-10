'use client'

import type { SavingsCategory, TfLFareSettings } from '../../lib/tfl/fares'

export function SavingsRules({ settings, onChange, lang }: { settings: TfLFareSettings; onChange: (settings: TfLFareSettings) => void; lang: 'en' | 'zh' }) {
  const options: Array<[SavingsCategory, string]> = lang === 'zh'
    ? [['commute', '\u901a\u52e4\u9a91\u884c'], ['transport', '\u65e5\u5e38\u4ea4\u901a'], ['leisure', '\u4f11\u95f2\u9a91\u884c']]
    : [['commute', 'Commute'], ['transport', 'Everyday transport'], ['leisure', 'Leisure Only']]
  const toggle = (category: SavingsCategory) => {
    const savingsCategories = settings.savingsCategories.includes(category)
      ? settings.savingsCategories.filter(value => value !== category)
      : [...settings.savingsCategories, category]
    onChange({ ...settings, savingsCategories, savingsMode: savingsCategories.length === 1 && savingsCategories[0] === 'commute' ? 'commute_only' : 'all_eligible' })
  }
  return <div className="space-y-2">{options.map(([category, label]) => <label key={category} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm text-slate-700"><input type="checkbox" checked={settings.savingsCategories.includes(category)} onChange={() => toggle(category)} className="h-4 w-4 accent-sky-600" />{label}</label>)}</div>
}
