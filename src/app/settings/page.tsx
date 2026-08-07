'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LanguageSwitcher } from '../../components/LanguageProvider'
import { SettingsPanel } from '../dashboard/_components/SettingsPanel'
import { demoSettings } from '../demo/mock-data'

export default function SettingsPage() {
  const [bikePrice, setBikePrice] = useState<string>(demoSettings.bikePrice)
  const [avoidedFare, setAvoidedFare] = useState(String(demoSettings.avoidedTransportCost))
  const [home, setHome] = useState<string>(demoSettings.homeStation)
  const [office, setOffice] = useState<string>(demoSettings.officeStation)
  const [morningStart, setMorningStart] = useState<string>(demoSettings.morningStart)
  const [morningEnd, setMorningEnd] = useState<string>(demoSettings.morningEnd)
  const [eveningStart, setEveningStart] = useState<string>(demoSettings.eveningStart)
  const [eveningEnd, setEveningEnd] = useState<string>(demoSettings.eveningEnd)
  const [message, setMessage] = useState(false)
  const showCta = () => setMessage(true)
  return <main className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-4xl space-y-4 md:space-y-6"><header className="flex items-center justify-between gap-3"><div><Link href="/demo" className="text-sm font-semibold text-sky-600">← Demo dashboard</Link><h1 className="mt-2 text-2xl font-bold text-slate-800">Settings</h1><p className="mt-1 text-sm text-slate-500">Explore what CycleWorth can personalise for a rider.</p></div><LanguageSwitcher /></header><div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">Demo Mode — settings changes are local only and are not saved.</div>{message && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-3 text-sm text-violet-800"><span>Create an account to save settings and connect your own rides.</span><Link href="/demo" className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white">Create account</Link></div>}<section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6"><h2 className="font-semibold text-slate-800">Bicycle profile</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-xs font-medium text-slate-600">Bicycle<input readOnly value={demoSettings.bicycle} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" /></label><label className="text-xs font-medium text-slate-600">Purchase price (£)<input type="number" value={bikePrice} onChange={event => setBikePrice(event.target.value)} onBlur={showCta} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" /></label><label className="text-xs font-medium text-slate-600">Default avoided fare (£)<input type="number" value={avoidedFare} onChange={event => setAvoidedFare(event.target.value)} onBlur={showCta} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" /></label></div></section><SettingsPanel collapseSettings={false} setCollapseSettings={() => undefined} homeStation={home} setHomeStation={setHome} officeStation={office} setOfficeStation={setOffice} morningStart={morningStart} setMorningStart={setMorningStart} morningEnd={morningEnd} setMorningEnd={setMorningEnd} eveningStart={eveningStart} setEveningStart={setEveningStart} eveningEnd={eveningEnd} setEveningEnd={setEveningEnd} handleSaveSettings={showCta} /><section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-slate-800">Strava connection</h2><p className="mt-1 text-sm text-slate-500">Connect Strava to import and classify your own rides.</p></div><button onClick={showCta} className="rounded-xl bg-[#FC4C02] px-4 py-2 text-xs font-semibold text-white">Create account to connect Strava</button></div></section></div></main>
}
