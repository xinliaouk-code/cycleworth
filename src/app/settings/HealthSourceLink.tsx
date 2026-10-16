'use client'

import Link from 'next/link'

export function HealthSourceLink({ lang }: { lang: 'en' | 'zh' }) {
  return <Link href="/settings/health" className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900"><span><strong>Apple Health</strong><span className="ml-2 text-xs">{lang === 'zh' ? '数据源与历史导入预览' : 'Data source & history preview'}</span></span><span aria-hidden="true">→</span></Link>
}
