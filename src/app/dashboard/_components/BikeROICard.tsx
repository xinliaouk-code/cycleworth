'use client'

import { TrendingUp, PiggyBank, Percent, Calendar, ChevronDown, ChevronUp, CheckCircle2, Award, Sparkles, Trophy } from 'lucide-react'
import { useLanguage } from '../../../components/LanguageProvider'
import { dashboardCardClass, dashboardCardTitleClass, dashboardCollapseButtonClass } from '../_lib/module-ui'

interface BikeROICardProps {
  collapseRoi: boolean
  setCollapseRoi: (value: boolean) => void
  bikePriceInput: string
  handleBikePriceChange: (value: string) => void
  handleBikePriceBlur: () => void
  estimatedSavings: string
  roiPercentageStr: string
  roiPercentageNum: number
  isFullyPaidBack: boolean
  paybackText: string
  totalDistanceKm?: number
}

export function BikeROICard(p: BikeROICardProps) {
  const { t, lang } = useLanguage()

  const dist = p.totalDistanceKm || 0
  const savingsNum = parseFloat(p.estimatedSavings) || 0

  const milestones = [
    {
      id: 'm1',
      title: lang === 'zh' ? '启航骑手' : 'First 50km',
      desc: '50 km',
      unlocked: dist >= 50,
      icon: '🚴‍♂️',
    },
    {
      id: 'm2',
      title: lang === 'zh' ? '百里骑侠' : '100km Explorer',
      desc: '100 km',
      unlocked: dist >= 100,
      icon: '🏆',
    },
    {
      id: 'm3',
      title: lang === 'zh' ? '省钱先锋' : '£50 Saved',
      desc: '£50',
      unlocked: savingsNum >= 50,
      icon: '🌟',
    },
    {
      id: 'm4',
      title: lang === 'zh' ? '车本回收者' : 'Fully Paid Back',
      desc: '100% ROI',
      unlocked: p.isFullyPaidBack,
      icon: '⚡',
    },
  ]

  const metrics = [
    {
      label: t.savings,
      value: `£${p.estimatedSavings}`,
      icon: PiggyBank,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      label: t.roiRate,
      value: `${p.roiPercentageStr}%`,
      icon: Percent,
      color: p.isFullyPaidBack ? 'text-emerald-600 font-extrabold' : 'text-sky-600',
      bg: 'bg-sky-50 text-sky-600 border-sky-100',
    },
    {
      label: t.estimatedPayback,
      value: p.paybackText,
      icon: Calendar,
      color: 'text-slate-800',
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
  ]

  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => p.setCollapseRoi(!p.collapseRoi)}
            title={p.collapseRoi ? t.expand : t.collapse}
            className={dashboardCollapseButtonClass}
          >
            {p.collapseRoi ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2">
            <h2 className={dashboardCardTitleClass}>{t.bikeRoi}</h2>
            {p.isFullyPaidBack && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                100%+
              </span>
            )}
          </div>
        </div>

        {!p.collapseRoi && (
          <label className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:w-auto">
            <span>{t.bikeCost}</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-bold">£</span>
              <input
                type="number"
                min="0"
                value={p.bikePriceInput}
                onChange={e => p.handleBikePriceChange(e.target.value)}
                onBlur={p.handleBikePriceBlur}
                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center font-bold text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              />
            </div>
          </label>
        )}
      </div>

      {!p.collapseRoi && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {metrics.map((item, idx) => {
              const IconComp = item.icon
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition-all hover:bg-white hover:shadow-xs"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.bg}`}>
                    <IconComp className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-500">{item.label}</span>
                    <span className={`mt-0.5 block truncate text-base font-bold md:text-lg ${item.color}`}>
                      {item.value}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progress Bar & Badges */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                {t.progress}
              </span>
              <span className="font-extrabold text-emerald-600">{p.roiPercentageStr}%</span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/80 p-0.5 shadow-2inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, p.roiPercentageNum))}%` }}
              />
            </div>

            {/* Milestones grid */}
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                {lang === 'zh' ? '骑行里程碑与成就勋章' : 'Riding Milestones & Badges'}
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {milestones.map(m => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-xs transition ${
                      m.unlocked
                        ? 'border-amber-200/80 bg-amber-50/70 text-amber-900 font-semibold shadow-2xs'
                        : 'border-slate-200/60 bg-white/50 text-slate-400 grayscale opacity-60'
                    }`}
                  >
                    <span className="text-base">{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-[11px]">{m.title}</span>
                      <span className="block text-[10px] text-slate-500">{m.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}


