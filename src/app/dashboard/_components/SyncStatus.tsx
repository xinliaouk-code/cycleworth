'use client'

import Link from 'next/link'
import { RefreshCw, RotateCcw, CheckCircle2, Link2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { useLanguage } from '../../../components/LanguageProvider'
import { dashboardCardClass, dashboardCardTitleClass, dashboardCollapseButtonClass } from '../_lib/module-ui'

interface SyncStatusProps {
  collapseSync: boolean
  setCollapseSync: (value: boolean) => void
  isConnected: boolean
  stravaAuthUrl: string
  handleSync: () => void
  handleFullResync: () => void
  isSyncing: boolean
  errorMessage?: string
  demo?: boolean
}

export function SyncStatus(props: SyncStatusProps) {
  const { t } = useLanguage()

  if (props.demo) {
    return (
      <section className={dashboardCardClass}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => props.setCollapseSync(!props.collapseSync)}
              className={dashboardCollapseButtonClass}
            >
              {props.collapseSync ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <h2 className={dashboardCardTitleClass}>Strava sync</h2>
          </div>
        </div>

        {!props.collapseSync && (
          <div className="mt-3.5 space-y-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 md:text-sm">
              Sample rides are shown in Demo Mode. Create an account to connect Strava and sync your real cycling activities.
            </p>
            <Link
              href="/login"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[#FC4C02] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#e04300] active:scale-95"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Create an account to connect Strava</span>
            </Link>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => props.setCollapseSync(!props.collapseSync)}
            title={props.collapseSync ? t.expand : t.collapse}
            className={dashboardCollapseButtonClass}
          >
            {props.collapseSync ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h2 className={`${dashboardCardTitleClass} truncate`}>{t.syncTitle}</h2>
            {props.isConnected && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                {t.connected}
              </span>
            )}
          </div>
        </div>

        {!props.collapseSync && (
          <div className="flex flex-wrap items-center gap-2">
            {!props.isConnected ? (
              <a
                href={props.stravaAuthUrl}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#FC4C02] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#e04300] active:scale-95"
              >
                <Link2 className="h-3.5 w-3.5" />
                {t.connectStrava}
              </a>
            ) : (
              <span className="sm:hidden inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {t.connected}
              </span>
            )}

            <button
              onClick={props.handleSync}
              disabled={props.isSyncing}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${props.isSyncing ? 'animate-spin' : ''}`} />
              <span>{props.isSyncing ? t.syncing : t.syncData}</span>
            </button>

            <button
              onClick={props.handleFullResync}
              disabled={props.isSyncing}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-900 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${props.isSyncing ? 'animate-spin' : ''}`} />
              <span>{props.isSyncing ? t.recalculating : t.fullResync}</span>
            </button>
          </div>
        )}
      </div>

      {!props.collapseSync && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 md:text-sm">{t.syncDesc}</p>

          {props.errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{props.errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

