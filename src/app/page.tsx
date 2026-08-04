export default function Home() {
  // 1. 替换为你最新部署成功的 Vercel 域名
  const DOMAIN = "https://cycleworth.vercel.app"; 
  
  // 2. 组装 Strava 授权链接 (回调地址指向你的 /api/callback 路由)
  const CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const REDIRECT_URI = `${DOMAIN}/api/strava/callback`;
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=force&scope=read,activity:read_all`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">
          CycleWorth 引擎已启动
        </h1>
        <p className="text-sm text-slate-500">
          伦敦个人通勤财务回报与减排分析系统已就绪。请授权连接您的 Strava 骑行数据以生成专属报表。
        </p>
        <div className="pt-2">
          {/* 这里换成了真正的 Strava 授权按钮，并使用了 Strava 的官方橘红色 */}
          <a
            href={stravaAuthUrl}
            className="inline-block w-full py-3 px-4 bg-[#fc4c02] text-white font-medium rounded-xl hover:bg-[#e34402] transition shadow-sm"
          >
            连接 Strava 账号
          </a>
        </div>
      </div>
    </main>
  );
}