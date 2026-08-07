import Link from 'next/link'
import { redirect } from 'next/navigation'

export default function HomePage() {
  if (process.env.NEXT_PUBLIC_APP_MODE === 'demo') {
    redirect('/demo')
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-2xl bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
          CycleWorth 🚲
        </h1>
        <p className="text-base md:text-lg text-slate-500">
          Every ride has value. 同步你的 Strava 骑行记录，追踪通勤数据，计算你省下的每一笔交通开支。
        </p>
        <div className="pt-6">
          <Link 
            href="/dashboard" 
            className="inline-block px-8 py-3.5 bg-sky-600 text-white font-semibold text-sm rounded-xl hover:bg-sky-700 transition shadow-sm"
          >
            进入主页
          </Link>
        </div>
      </div>
    </main>
  )
}
