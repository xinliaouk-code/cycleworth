'use client'

import { useState, useMemo } from 'react'
import { Bike, MapPin, Lock, ArrowRight, Clock, ChevronDown, ChevronUp, Search, Filter, Gauge, Zap } from 'lucide-react'
import { Ride, formatDateCN, getRideSaving, isRideSavingsEligible } from '../_lib/utils'
import { useLanguage } from '../../../components/LanguageProvider'
import { type TfLFareSettings } from '../../../lib/tfl/fares'
import { dashboardCardClass, dashboardCardTitleClass, dashboardCollapseButtonClass } from '../_lib/module-ui'

interface RideListProps {
  rides: Ride[]
  collapseRides: boolean
  setCollapseRides: (value: boolean) => void
  setSelectedRide: (ride: Ride) => void
  handleSelectCategory: (ride: Ride, category: string) => void
  fareSettings: TfLFareSettings
}

const categories = { commute: '通勤骑行', transport: '日常交通', leisure: '休闲骑行' }

export function RideList(p: RideListProps) {
  const { lang } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'distance' | 'savings'>('date')

  const text = lang === 'zh'
    ? {
        title: '近期骑行明细',
        noRides: '暂无符合条件的骑行记录',
        start: '起点站',
        end: '终点站',
        unknown: '未知',
        minutes: '分钟',
        expand: '展开模块',
        collapse: '收起模块',
        locked: '已锁定',
        commute: '通勤骑行',
        transport: '日常交通',
        leisure: '休闲骑行',
        all: '全部分类',
        searchPlaceholder: '搜索路线、名称或车站...',
        sortDate: '日期最新',
        sortDistance: '里程最长',
        sortSavings: '省钱最多',
        avgSpeed: '均速',
      }
    : {
        title: 'Recent rides',
        noRides: 'No matching ride activities found',
        start: 'Start station',
        end: 'End station',
        unknown: 'Unknown',
        minutes: 'min',
        expand: 'Expand section',
        collapse: 'Collapse section',
        locked: 'Locked',
        commute: 'Commute',
        transport: 'Everyday transport',
        leisure: 'Leisure Only',
        all: 'All Categories',
        searchPlaceholder: 'Search route, title or station...',
        sortDate: 'Newest date',
        sortDistance: 'Longest distance',
        sortSavings: 'Highest savings',
        avgSpeed: 'Avg Speed',
      }

  const filteredRides = useMemo(() => {
    let result = [...p.rides]

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        r =>
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.start_station && r.start_station.toLowerCase().includes(q)) ||
          (r.end_station && r.end_station.toLowerCase().includes(q))
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(r => {
        const cat = r.category || (r.is_commute ? categories.transport : categories.leisure)
        return cat === categoryFilter
      })
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'distance') {
        return (b.distance || 0) - (a.distance || 0)
      }
      if (sortBy === 'savings') {
        return getRideSaving(b, p.fareSettings) - getRideSaving(a, p.fareSettings)
      }
      // date
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    })

    return result
  }, [p.rides, searchQuery, categoryFilter, sortBy, p.fareSettings])

  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => p.setCollapseRides(!p.collapseRides)}
            title={p.collapseRides ? text.expand : text.collapse}
            className={dashboardCollapseButtonClass}
          >
            {p.collapseRides ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2">
            <h2 className={dashboardCardTitleClass}>{text.title}</h2>
            <span className="inline-flex items-center justify-center rounded-full bg-sky-100/80 px-2.5 py-0.5 text-xs font-bold text-sky-800">
              {filteredRides.length} / {p.rides.length}
            </span>
          </div>
        </div>

        {!p.collapseRides && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Bar */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={text.searchPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-sky-500 focus:bg-white"
            >
              <option value="date">{text.sortDate}</option>
              <option value="distance">{text.sortDistance}</option>
              <option value="savings">{text.sortSavings}</option>
            </select>
          </div>
        )}
      </div>

      {!p.collapseRides && (
        <div className="mt-4 space-y-3">
          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                categoryFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {text.all}
            </button>
            <button
              onClick={() => setCategoryFilter(categories.commute)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                categoryFilter === categories.commute
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
              }`}
            >
              {text.commute}
            </button>
            <button
              onClick={() => setCategoryFilter(categories.transport)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                categoryFilter === categories.transport
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100'
              }`}
            >
              {text.transport}
            </button>
            <button
              onClick={() => setCategoryFilter(categories.leisure)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                categoryFilter === categories.leisure
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100'
              }`}
            >
              {text.leisure}
            </button>
          </div>

          {filteredRides.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <Bike className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-500">{text.noRides}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRides.map(ride => {
                const category = ride.category || (ride.is_commute ? categories.transport : categories.leisure)
                const rideSaving = getRideSaving(ride, p.fareSettings).toFixed(2)
                const isEligible = isRideSavingsEligible(ride, p.fareSettings)

                const categoryBadge = category === categories.commute
                  ? 'border-emerald-200/80 bg-emerald-50 text-emerald-800'
                  : category === categories.transport
                  ? 'border-sky-200/80 bg-sky-50 text-sky-800'
                  : 'border-slate-200 bg-slate-100 text-slate-600'

                const distanceKm = ride.distance / 1000
                const speedKmh = ride.moving_time > 0 ? (distanceKm / (ride.moving_time / 3600)).toFixed(1) : '0.0'

                return (
                  <article
                    key={ride.id}
                    onClick={() => p.setSelectedRide(ride)}
                    className="group relative cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all hover:border-sky-300 hover:shadow-md active:scale-[0.99] md:p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="max-w-[200px] truncate text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors sm:max-w-[280px]">
                            {ride.name || 'Untitled ride'}
                          </p>

                          {ride.is_manual_override && (
                            <span
                              title="This ride is locked after a manual category change."
                              className="inline-flex items-center gap-0.5 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                            >
                              <Lock className="h-2.5 w-2.5" />
                              {text.locked}
                            </span>
                          )}

                          <div className="shrink-0" onClick={e => e.stopPropagation()}>
                            <select
                              value={category}
                              onChange={e => p.handleSelectCategory(ride, e.target.value)}
                              className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-bold transition focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${categoryBadge}`}
                            >
                              <option value={categories.commute}>{text.commute}</option>
                              <option value={categories.transport}>{text.transport}</option>
                              <option value={categories.leisure}>{text.leisure}</option>
                            </select>
                          </div>
                        </div>

                        <div className={`mt-1.5 flex min-w-0 flex-nowrap items-center gap-1.5 whitespace-nowrap font-medium text-slate-500 ${lang === 'zh' ? 'text-[11px]' : 'text-xs'}`}>
                          <span>{formatDateCN(ride.start_date, lang)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {Math.round(ride.moving_time / 60)} {text.minutes}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-600 font-semibold">
                            <Gauge className="h-3 w-3 text-sky-500" />
                            {speedKmh} km/h
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="flex items-baseline justify-end gap-0.5">
                          <span className="text-lg font-extrabold text-slate-900">
                            {distanceKm.toFixed(1)}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">km</span>
                        </div>
                        {isEligible && (
                          <span className="mt-0.5 block text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            +£{rideSaving}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs">
                      <div className="min-w-0 flex-1 truncate">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {text.start}
                        </span>
                        <span className="block truncate font-semibold text-slate-800">
                          {ride.start_station || text.unknown}
                        </span>
                      </div>

                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />

                      <div className="min-w-0 flex-1 truncate text-right sm:text-left">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {text.end}
                        </span>
                        <span className="block truncate font-semibold text-slate-800">
                          {ride.end_station || text.unknown}
                        </span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

