'use client'

import React from 'react'
import { Ride, formatDateCN } from '../_lib/utils'

interface RideListProps {
  rides: Ride[]
  collapseRides: boolean
  setCollapseRides: (val: boolean) => void
  setSelectedRide: (ride: Ride) => void
  handleSelectCategory: (ride: Ride, category: string) => void
}

export function RideList({
  rides,
  collapseRides,
  setCollapseRides,
  setSelectedRide,
  handleSelectCategory
}: RideListProps) {
  return (
    <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3 transition-all">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setCollapseRides(!collapseRides)}
          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition cursor-pointer"
          title={collapseRides ? "展开模块" : "收起模块"}
        >
          {collapseRides ? '+' : '−'}
        </button>
        <h2 className="text-base md:text-lg font-semibold text-slate-800">近期骑行明细</h2>
      </div>
      
      {!collapseRides && (
        <div>
          {rides.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">暂无骑行记录，请先点击上方“同步记录”。</p>
          ) : (
            <div className="space-y-3 pt-1">
              {rides.map((ride) => {
                const currentCategory = ride.category || (ride.is_commute ? '日常交通' : '休闲骑行')
                
                return (
                  <div 
                    key={ride.id} 
                    onClick={() => setSelectedRide(ride)}
                    className="p-3.5 md:p-4 bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 hover:shadow-md transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 text-base md:text-lg truncate max-w-[150px] sm:max-w-[220px]">
                            {ride.name || '无标题骑行'}
                          </p>
                          {ride.is_manual_override && (
                            <span
                              className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap"
                              title="此条骑行的分类曾被你手动修改过，自动同步/重算会保留你的手动选择"
                            >
                              已手动修改
                            </span>
                          )}
                          <select
                            value={currentCategory}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleSelectCategory(ride, e.target.value)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-medium shrink-0 cursor-pointer border focus:outline-none appearance-none transition ${
                              currentCategory === '通勤骑行'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : currentCategory === '日常交通'
                                ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <option value="通勤骑行">💼 通勤骑行</option>
                            <option value="日常交通">🚲 日常交通</option>
                            <option value="休闲骑行">☕ 休闲骑行</option>
                          </select>
                        </div>
                        <p className="text-xs md:text-sm text-slate-400 mt-1 font-normal">
                          {formatDateCN(ride.start_date)} · {Math.round(ride.moving_time / 60)} 分钟
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-800 text-base md:text-lg">{(ride.distance / 1000).toFixed(1)}</span>
                        <span className="text-xs text-slate-400 font-medium ml-0.5">km</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100/80">
                      <div className="flex-1 truncate">
                        <span className="text-slate-400 block text-[9px] leading-tight mb-0.5">起点站</span>
                        <span className="font-semibold text-slate-700 truncate block">{ride.start_station || '未知'}</span>
                      </div>
                      <span className="text-slate-300 font-bold px-1">→</span>
                      <div className="flex-1 truncate">
                        <span className="text-slate-400 block text-[9px] leading-tight mb-0.5">终点站</span>
                        <span className="font-semibold text-slate-700 truncate block">{ride.end_station || '未知'}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
