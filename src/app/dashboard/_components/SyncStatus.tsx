'use client'
import Link from 'next/link'
import {ChevronDown,ChevronUp,Heart} from 'lucide-react'
import {useLanguage} from '../../../components/LanguageProvider'
import {dashboardCardClass,dashboardCardTitleClass,dashboardCollapseButtonClass} from '../_lib/module-ui'
export function SyncStatus({collapseSync,setCollapseSync,demo=false}:{collapseSync:boolean;setCollapseSync:(v:boolean)=>void;demo?:boolean}){
 const {lang}=useLanguage(),zh=lang==='zh'
 return <section className={dashboardCardClass}>
  <div className="flex items-center gap-2.5"><button aria-label={collapseSync?'Expand':'Collapse'} className={dashboardCollapseButtonClass} onClick={()=>setCollapseSync(!collapseSync)}>{collapseSync?<ChevronDown className="h-4 w-4"/>:<ChevronUp className="h-4 w-4"/>}</button><Heart className="h-4 w-4 text-rose-500"/><h2 className={dashboardCardTitleClass}>Apple Health Sync</h2></div>
  {!collapseSync&&<div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><p className="max-w-md text-xs leading-5 text-slate-500">{zh?'通过 iPhone Health Auto Export 上传骑行；在设置中查看状态或导入历史 JSON。':'Upload rides with Health Auto Export on iPhone. View sync status or import historical JSON in Settings.'}</p><Link href={demo?'/login':'/settings#apple-health-sync'} className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">{zh?'管理 Apple Health':'Manage Apple Health'} →</Link></div>}
 </section>
}
