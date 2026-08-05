'use client'

import React from 'react'

interface SettingsPanelProps {
  collapseSettings: boolean
  setCollapseSettings: (val: boolean) => void
  homeStation: string
  setHomeStation: (val: string) => void
  officeStation: string
  setOfficeStation: (val: string) => void
  morningStart: string
  setMorningStart: (val: string) => void
  morningEnd: string
  setMorningEnd: (val: string) => void
  eveningStart: string
  setEveningStart: (val: string) => void
  eveningEnd: string
  setEveningEnd: (val: string) => void
  handleSaveSettings: () => void
}

export function SettingsPanel({
  collapseSettings,
  setCollapseSettings,
  homeStation,
  setHomeStation,
  officeStation,
  setOfficeStation,
  morningStart,
  setMorningStart,
  morningEnd,
  setMorningEnd,
  eveningStart,
  setEveningStart,
  eveningEnd,
  setEveningEnd,
  handleSaveSettings
}: SettingsPanelProps) {
  return (
    <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCollapseSettings(!collapseSettings)}
            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition cursor-pointer"
            title={collapseSettings ? "展开模块" : "收起模块"}
          >
            {collapseSettings ? '+' : '−'}
          </button>
          <h2 className="text-base md:text-lg font-semibold text-slate-800">⚙️ 通勤与日常交通规则设置</h2>
        </div>
      </div>

      {!collapseSettings && (
        <div className="space-y-4 pt-2 border-t border-slate-100 text-xs md:text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-600 mb-1">🏠 家附近站点 (用逗号分隔)</label>
              <input 
                type="text" 
                value={homeStation} 
                onChange={e => setHomeStation(e.target.value)} 
                placeholder="如: Custom House, Royal Victoria" 
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">🏢 公司附近站点 (用逗号分隔)</label>
              <input 
                type="text" 
                value={officeStation} 
                onChange={e => setOfficeStation(e.target.value)} 
                placeholder="如: Bank, Old Street, Canary Wharf" 
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-medium text-slate-600 mb-1">🌅 上班最早点 (点)</label>
              <input type="number" min="0" max="23" value={morningStart} onChange={e => setMorningStart(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">🌅 上班最晚点 (点)</label>
              <input type="number" min="0" max="23" value={morningEnd} onChange={e => setMorningEnd(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">🌆 下班最早点 (点)</label>
              <input type="number" min="0" max="23" value={eveningStart} onChange={e => setEveningStart(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">🌆 下班最晚点 (点)</label>
              <input type="number" min="0" max="23" value={eveningEnd} onChange={e => setEveningEnd(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button 
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl text-xs transition cursor-pointer"
            >
              保存设置
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
