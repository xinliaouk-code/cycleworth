import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { code } = await request.json()

  // 拿着临时码和我们保密的 Secret，去向 Strava 兑换真通行证
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code'
    })
  })

  const data = await res.json()
  return NextResponse.json(data) // 把换到的真通行证发给前端
}