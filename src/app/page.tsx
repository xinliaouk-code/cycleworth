import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">CycleWorth 骑行通勤估值</h1>
        <p className="text-sm text-slate-500">
          欢迎使用个人财务与骑行回报分析系统。点击下方按钮进入您的专属控制台。
        </p>
        <div className="pt-2">
          <a
            href="/dashboard"
            className="inline-block w-full py-3 px-4 bg-sky-600 text-white font-medium rounded-xl hover:bg-sky-700 transition"
          >
            进入 Dashboard 控制台
          </a>
        </div>
      </div>
    </main>
  )
}