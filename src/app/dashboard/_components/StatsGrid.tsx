import React from 'react'

interface StatsGridProps {
  totalRides: number
  totalDistanceKm: string
  estimatedSavings: string
}

export function StatsGrid({ totalRides, totalDistanceKm, estimatedSavings }: StatsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
        <p className="text-xs md:text-sm font-medium text-slate-400">总骑行次数</p>
        <p className="text-xl md:text-3xl font-bold text-slate-800 mt-1 md:mt-2">
          {totalRides} <span className="text-xs md:text-sm font-normal text-slate-500">次</span>
        </p>
      </div>
      <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
        <p className="text-xs md:text-sm font-medium text-slate-400">总骑行距离</p>
        <p className="text-xl md:text-3xl font-bold text-slate-800 mt-1 md:mt-2">
          {totalDistanceKm} <span className="text-xs md:text-sm font-normal text-slate-500">km</span>
        </p>
      </div>
      <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 bg-gradient-to-br from-sky-50 to-white">
        <p className="text-xs md:text-sm font-medium text-sky-600">已节省开支</p>
        <p className="text-xl md:text-3xl font-bold text-sky-700 mt-1 md:mt-2">£{estimatedSavings}</p>
      </div>
    </div>
  )
}
