'use client'

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { ChevronDown, ChevronUp, BarChart2 } from 'lucide-react'
import { useLanguage } from '../../../components/LanguageProvider'
import { dashboardCardClass, dashboardCardTitleClass, dashboardCollapseButtonClass } from '../_lib/module-ui'

interface WeeklyChartProps {
  collapseChart: boolean
  setCollapseChart: (value: boolean) => void
  chartData: Array<{ shortWeek: string; distance: number; savings: number }>
}

export function WeeklyChart({ collapseChart, setCollapseChart, chartData }: WeeklyChartProps) {
  const { lang } = useLanguage()

  if (chartData.length === 0) return null

  const labels = lang === 'zh'
    ? {
        title: '周度骑行里程与节省开支趋势',
        subtitle: '比较每周骑行距离 (km) 与节省金额 (£)',
        distance: '骑行里程',
        savings: '节省开支',
        expand: '展开模块',
        collapse: '收起模块',
      }
    : {
        title: 'Weekly distance & savings trend',
        subtitle: 'Comparing weekly distance (km) and savings (£)',
        distance: 'Distance',
        savings: 'Savings',
        expand: 'Expand section',
        collapse: 'Collapse section',
      }

  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setCollapseChart(!collapseChart)}
            title={collapseChart ? labels.expand : labels.collapse}
            className={dashboardCollapseButtonClass}
          >
            {collapseChart ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <div className="min-w-0">
            <h2 className={dashboardCardTitleClass}>{labels.title}</h2>
            {!collapseChart && <p className="text-xs font-medium text-slate-400">{labels.subtitle}</p>}
          </div>
        </div>

        {!collapseChart && (
          <div className="flex items-center gap-4 text-xs font-bold shrink-0 self-end md:self-auto">
            <span className="inline-flex items-center gap-1.5 text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              {labels.distance} (km)
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {labels.savings} (£)
            </span>
          </div>
        )}
      </div>

      {!collapseChart && (
        <div className="h-64 w-full pt-4 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="shortWeek" tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fill: '#0284c7', fontSize: 11, fontWeight: 600 }} />
              <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#059669', fontSize: 11, fontWeight: 600 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                formatter={(value: unknown, name: unknown) => [
                  String(name) === 'distance' ? `${value ?? ''} km` : `£${value ?? ''}`,
                  String(name) === 'distance' ? labels.distance : labels.savings,
                ]}
              />
              <Bar yAxisId="left" dataKey="distance" name="distance" fill="#0284c7" radius={[6, 6, 0, 0]} barSize={14} />
              <Bar yAxisId="right" dataKey="savings" name="savings" fill="#10b981" radius={[6, 6, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

