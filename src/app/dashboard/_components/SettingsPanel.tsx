'use client'

import { MapPin, Clock, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { useLanguage } from '../../../components/LanguageProvider'
import { dashboardCardClass, dashboardCardTitleClass, dashboardCollapseButtonClass } from '../_lib/module-ui'

interface SettingsPanelProps {
  collapseSettings: boolean
  setCollapseSettings: (v: boolean) => void
  homeStation: string
  setHomeStation: (v: string) => void
  officeStation: string
  setOfficeStation: (v: string) => void
  morningStart: string
  setMorningStart: (v: string) => void
  morningEnd: string
  setMorningEnd: (v: string) => void
  eveningStart: string
  setEveningStart: (v: string) => void
  eveningEnd: string
  setEveningEnd: (v: string) => void
  handleSaveSettings: () => void
}

export function SettingsPanel(p: SettingsPanelProps) {
  const { t } = useLanguage()

  return (
    <section className={dashboardCardClass}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => p.setCollapseSettings(!p.collapseSettings)}
            title={p.collapseSettings ? t.expand : t.collapse}
            className={dashboardCollapseButtonClass}
          >
            {p.collapseSettings ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <h2 className={dashboardCardTitleClass}>{t.commuteRules}</h2>
        </div>
      </div>

      {!p.collapseSettings && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5 mb-1 text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-sky-500" />
                {t.homeStations}
              </span>
              <input
                type="text"
                value={p.homeStation}
                onChange={e => p.setHomeStation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium text-slate-800 transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5 mb-1 text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                {t.officeStations}
              </span>
              <input
                type="text"
                value={p.officeStation}
                onChange={e => p.setOfficeStation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-medium text-slate-800 transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              />
            </label>
          </div>

          <div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              {t.morningStart} / {t.eveningStart}
            </span>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <label className="block text-[11px] font-medium text-slate-500">
                {t.morningStart} (h)
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={p.morningStart}
                  onChange={e => p.setMorningStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-bold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
                />
              </label>
              <label className="block text-[11px] font-medium text-slate-500">
                {t.morningEnd} (h)
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={p.morningEnd}
                  onChange={e => p.setMorningEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-bold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
                />
              </label>
              <label className="block text-[11px] font-medium text-slate-500">
                {t.eveningStart} (h)
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={p.eveningStart}
                  onChange={e => p.setEveningStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-bold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
                />
              </label>
              <label className="block text-[11px] font-medium text-slate-500">
                {t.eveningEnd} (h)
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={p.eveningEnd}
                  onChange={e => p.setEveningEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-bold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={p.handleSaveSettings}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-95 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{t.saveSettings}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

