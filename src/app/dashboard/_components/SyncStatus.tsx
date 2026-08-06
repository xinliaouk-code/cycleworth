'use client'

import { useLanguage } from '../../../components/LanguageProvider'

interface SyncStatusProps { collapseSync: boolean; setCollapseSync: (value: boolean) => void; isConnected: boolean; stravaAuthUrl: string; handleSync: () => void; handleFullResync: () => void; isSyncing: boolean }

export function SyncStatus(p: SyncStatusProps) {
  const { t } = useLanguage()
  return <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm md:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2"><button onClick={() => p.setCollapseSync(!p.collapseSync)} title={p.collapseSync ? t.expand : t.collapse} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{p.collapseSync ? '+' : '-'}</button><h2 className="whitespace-nowrap text-base font-semibold text-slate-800 md:text-lg">{t.syncTitle}</h2></div>{!p.collapseSync && <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">{p.isConnected ? <span className="rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 text-center text-xs font-medium text-green-700">Connected</span> : <a href={p.stravaAuthUrl} className="rounded-xl bg-[#FC4C02] px-3 py-1.5 text-center text-xs font-medium text-white">{t.connectStrava}</a>}<button onClick={p.handleSync} disabled={p.isSyncing} className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{p.isSyncing ? t.syncing : t.syncData}</button><button onClick={p.handleFullResync} disabled={p.isSyncing} className="col-span-2 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 sm:col-auto">{p.isSyncing ? t.recalculating : t.fullResync}</button></div>}</div>{!p.collapseSync && <p className="text-xs text-slate-500 md:text-sm">{t.syncDesc}</p>}</section>
}
