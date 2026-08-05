'use client'

import React from 'react'

interface BikeROICardProps {
  collapseRoi: boolean
  setCollapseRoi: (val: boolean) => void
  bikePriceInput: string
  handleBikePriceChange: (val: string) => void
  handleBikePriceBlur: () => void
  estimatedSavings: string
  roiPercentageStr: string
  roiPercentageNum: number
  isFullyPaidBack: boolean
  paybackText: string
}

export function BikeROICard({
  collapseRoi,
  setCollapseRoi,
  bikePriceInput,
  handleBikePriceChange,
  handleBikePriceBlur,
  estimatedSavings,
  roiPercentageStr,
  roiPercentageNum,
  isFullyPaidBack,
  paybackText
}: BikeROICardProps) {
  return (
    <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCollapseRoi(!collapseRoi)}
            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition cursor-pointer"
            title={collapseRoi ? "展开模块" : "收起模块"}
          >
            {collapseRoi ? '+' : '−'}
          </button>
          <h2 className="text-base md:text-lg font-semibold text-slate-800">🚲 Bike ROI</h2>
        </div>
        {!collapseRoi && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden md:inline">购车/装备成本 (£):</span>
            <input 
              type="number" 
              value={bikePriceInput}
              onChange={(e) => handleBikePriceChange(e.target.value)}
              onBlur={handleBikePriceBlur}
              placeholder="如: 500"
              className="w-20 md:w-24 px-2.5 py-1 text-xs md:text-sm border border-slate-200 rounded-xl font-medium text-slate-700 text-center focus:outline-none focus:border-sky-500"
            />
          </div>
        )}
      </div>

      {!collapseRoi && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-400 block font-medium">已节省开支 (Savings)</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">£{estimatedSavings}</span>
            </div>
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-400 block font-medium">ROI 回报率</span>
              <span className="text-xl font-bold text-emerald-600 mt-1 block">{roiPercentageStr}%</span>
            </div>
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-400 block font-medium">Estimated Payback (预估回本)</span>
              <span className={`text-xs md:text-sm font-bold mt-1.5 block ${isFullyPaidBack ? 'text-emerald-600' : 'text-slate-700'}`}>
                {paybackText}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-slate-500">回本进度 (Progress)</span>
              <span className="text-emerald-600 font-bold">{roiPercentageStr}%</span>
            </div>
            <div className="w-full bg-slate-200/80 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, roiPercentageNum))}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
