'use client'

import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface WeeklyChartProps {
  collapseChart: boolean
  setCollapseChart: (val: boolean) => void
  chartData: any[]
}

export function WeeklyChart({ collapseChart, setCollapseChart, chartData }: WeeklyChartProps) {
  if (chartData.length === 0) return null

  return (
    <div className="bg-white p-3.5 md:p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCollapseChart(!collapseChart)}
            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs transition cursor-pointer"
            title={collapseChart ? "展开模块" : "收起模块"}
          >
            {collapseChart ? '+' : '−'}
          </button>
          <div>
            <h2 className="text-base md:text-lg font-semibold text-slate-800">周度骑行里程与节省开支趋势</h2>
            {!collapseChart && <p className="text-xs md:text-sm text-slate-400 mt-0.5">对比每周的总骑行距离 (km) 与 TfL 节省金额 (£)</p>}
          </div>
        </div>
        {!collapseChart && (
          <div className="flex items-center gap-3 text-[11px] md:text-xs font-medium">
            <span className="flex items-center gap-1 text-sky-600">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span> 里程 (km)
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> 开支 (£)
            </span>
          </div>
        )}
      </div>

      {!collapseChart && (
        <div className="w-full h-64 md:h-72 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="shortWeek" 
                tickLine={false} 
                axisLine={{ stroke: '#cbd5e1' }} 
                tick={{ fill: '#64748b', fontSize: 10 }} 
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#0284c7', fontSize: 10 }} 
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#059669', fontSize: 10 }} 
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any, name: any): [string, string] => [
                  name === 'distance' ? `${value} km` : `£${value}`,
                  name === 'distance' ? '骑行里程' : '节省开支'
                ]}
                labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
              />
              <Bar yAxisId="left" dataKey="distance" name="distance" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={12} />
              <Bar yAxisId="right" dataKey="savings" name="savings" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
