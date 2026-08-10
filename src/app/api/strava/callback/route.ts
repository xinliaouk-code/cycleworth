import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // 获取网址中的信息
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    // 如果拿到了临时码，带着这个码跳回我们的控制台界面
    return NextResponse.redirect(new URL(`/dashboard?code=${code}`, request.url))
  }

  // 如果没有码，说明出错了
  return NextResponse.redirect(new URL('/dashboard?error=no_code', request.url))
}