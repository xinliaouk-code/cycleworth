'use client'

import React from 'react'

interface SyncStatusProps {
  collapseSync: boolean
  setCollapseSync: (val: boolean) => void
  isConnected: boolean
  stravaAuthUrl: string
  handleSync: () => void
  handleFullResync: () => void
  isSyncing: boolean
}

export function SyncStatus({
  collapseSync,
  setCollapseSync,
  isConnected,
  stravaAuthUrl,
  handleSync,
  handleFullResync,
  isSyncing
}: SyncStatusProps) {
  return (
    <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCollapseSync(!collapseSync)}
            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition cursor-pointer"
            title={collapseSync ? "展开模块" : "收起模块"}
          >
            {collapseSync ? '+' : '−'}
          </button>
          <h2 className="text-base md:text-lg font-semibold text-slate-800">Strava 数据同步</h2>
        </div>
        {!collapseSync && (
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="text-center px-3 py-1.5 bg-green-50 text-green-700 font-medium text-xs rounded-xl border border-green-200">
                ✓ 已连接
              </span>
            ) : (
              <a href={stravaAuthUrl} className="text-center px-3 py-1.5 bg-[#FC4C02] text-white text-xs font-medium rounded-xl hover:bg-[#E34402]">
                连接 Strava
              </a>
            )}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="text-center px-3 py-1.5 bg-sky-600 text-white text-xs font-medium rounded-xl hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
            >
              {isSyncing ? '同步中...' : '同步记录'}
            </button>
            <button
              onClick={handleFullResync}
              disabled={isSyncing}
              className="text-center px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 cursor-pointer"
              title="忽略增量、重新拉取全部历史并按最新站点库重算分类"
            >
              {isSyncing ? '重算中...' : '全量重算'}
            </button>
          </div>
        )}
      </div>

      {!collapseSync && (
        <p className="text-xs md:text-sm text-slate-500">点击同步将自动清洗并识别“通勤骑行”、“日常交通”与“休闲骑行”。</p>
      )}
    </div>
  )
}
