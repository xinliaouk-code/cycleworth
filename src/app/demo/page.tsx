'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LanguageSwitcher, useLanguage } from '../../components/LanguageProvider'
import { DEFAULT_TFL_FARE_SETTINGS } from '../../lib/tfl/fares'
import { calculateROI, prepareChartData } from '../dashboard/_lib/utils'
import { StatsGrid } from '../dashboard/_components/StatsGrid'
import { BikeROICard } from '../dashboard/_components/BikeROICard'
import { SettingsPanel } from '../dashboard/_components/SettingsPanel'
import { SyncStatus } from '../dashboard/_components/SyncStatus'
import { WeeklyChart } from '../dashboard/_components/WeeklyChart'
import { RideList } from '../dashboard/_components/RideList'
import { MaintenanceCard } from '../dashboard/_components/MaintenanceCard'
import { RideHeatmap } from '../dashboard/_components/RideHeatmap'
import { RideAdviceCard } from '../dashboard/_components/RideAdviceCard'
import { RideDetailModal } from '../dashboard/_components/RideDetailModal'
import type { Ride } from '../dashboard/_lib/utils'
import { demoMaintenanceTasks, demoRideAdvice, demoRides, demoSettings } from './mock-data'

export default function DemoPage() {
  const { lang, t } = useLanguage()
  const [bikePrice, setBikePrice] = useState<string>(demoSettings.bikePrice)
  const [collapseSettings, setCollapseSettings] = useState(true)
  const [collapseRoi, setCollapseRoi] = useState(false)
  const [collapseSync, setCollapseSync] = useState(false)
  const [collapseChart, setCollapseChart] = useState(false)
  const [collapseRides, setCollapseRides] = useState(false)
  const [cta, setCta] = useState(false)
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null)
  const [home, setHome] = useState<string>(demoSettings.homeStation)
  const [office, setOffice] = useState<string>(demoSettings.officeStation)
  const [morningStart, setMorningStart] = useState<string>(demoSettings.morningStart)
  const [morningEnd, setMorningEnd] = useState<string>(demoSettings.morningEnd)
  const [eveningStart, setEveningStart] = useState<string>(demoSettings.eveningStart)
  const [eveningEnd, setEveningEnd] = useState<string>(demoSettings.eveningEnd)
  const totalDistanceKm = (demoRides.reduce((sum, ride) => sum + ride.distance, 0) / 1000).toFixed(1)
  const totalCalories = demoRides.reduce((sum, ride) => sum + (ride.calories ?? 0), 0)
  const roi = calculateROI(demoRides, bikePrice, DEFAULT_TFL_FARE_SETTINGS, lang)
  const chartData = prepareChartData(demoRides, DEFAULT_TFL_FARE_SETTINGS)
  const showCta = () => setCta(true)

  return <main className="min-h-screen bg-slate-50 px-2 py-4 md:p-8"><div className="mx-auto flex max-w-4xl flex-col gap-4 md:gap-6">
    <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between"><div><b>Demo Mode</b><span className="ml-2 text-sky-700">Sample cycling data only — no account, database writes, or Strava requests.</span></div><Link href="/login" className="shrink-0 rounded-xl bg-sky-600 px-3 py-2 text-center text-xs font-semibold text-white">Create account</Link></div>
    <header className="flex items-start justify-between gap-3 px-1 sm:items-center"><div className="min-w-0"><h1 className="text-2xl font-bold tracking-tight text-slate-800">CycleWorth</h1><p className="mt-0.5 text-sm text-slate-500">{t.tagline}</p></div><div className="flex shrink-0 items-center gap-2"><Link href="/maintenance" className="hidden text-xs font-semibold text-slate-500 hover:text-sky-600 sm:inline">Maintenance</Link><Link href="/settings" title="Settings" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:text-sky-600 sm:h-auto sm:w-auto sm:border-0 sm:bg-transparent sm:px-0 sm:text-xs sm:font-semibold">⚙<span className="hidden sm:inline">Settings</span></Link><LanguageSwitcher /></div></header>
    {cta && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-3 text-sm text-violet-800"><span>Demo data is read-only. Create an account to save changes or sync Strava.</span><Link href="/login" className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white">Create account</Link></div>}
    <RideAdviceCard initialData={demoRideAdvice} demo />
    <StatsGrid totalRides={demoRides.length} totalDistanceKm={totalDistanceKm} estimatedSavings={roi.estimatedSavings} totalCalories={totalCalories} />
    <MaintenanceCard odometerKm={Number(totalDistanceKm)} demoTasks={demoMaintenanceTasks} onDemoCta={showCta} />
    <RideHeatmap rides={demoRides} />
    <BikeROICard {...roi} collapseRoi={collapseRoi} setCollapseRoi={setCollapseRoi} bikePriceInput={bikePrice} handleBikePriceChange={setBikePrice} handleBikePriceBlur={showCta} />
    <SettingsPanel collapseSettings={collapseSettings} setCollapseSettings={setCollapseSettings} homeStation={home} setHomeStation={setHome} officeStation={office} setOfficeStation={setOffice} morningStart={morningStart} setMorningStart={setMorningStart} morningEnd={morningEnd} setMorningEnd={setMorningEnd} eveningStart={eveningStart} setEveningStart={setEveningStart} eveningEnd={eveningEnd} setEveningEnd={setEveningEnd} handleSaveSettings={showCta} />
    <SyncStatus demo collapseSync={collapseSync} setCollapseSync={setCollapseSync} isConnected={false} stravaAuthUrl="" handleSync={showCta} handleFullResync={showCta} isSyncing={false} />
    <WeeklyChart collapseChart={collapseChart} setCollapseChart={setCollapseChart} chartData={chartData} />
    <RideList rides={demoRides} fareSettings={DEFAULT_TFL_FARE_SETTINGS} collapseRides={collapseRides} setCollapseRides={setCollapseRides} setSelectedRide={setSelectedRide} handleSelectCategory={showCta} />
  </div>{selectedRide && <RideDetailModal ride={selectedRide} onClose={() => setSelectedRide(null)} />}</main>
}
