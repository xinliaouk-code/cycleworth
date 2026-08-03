export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">
          CycleWorth 引擎已启动
        </h1>
        <p className="text-sm text-slate-500">
          伦敦个人通勤财务回报与减排分析系统已就绪。
        </p>
        <div className="pt-2">
          <a
            href="/dashboard"
            className="inline-block w-full py-3 px-4 bg-sky-600 text-white font-medium rounded-xl hover:bg-sky-700 transition shadow-sm"
          >
            进入 Dashboard 控制台 →
          </a>
        </div>
      </div>
    </main>
  );
}