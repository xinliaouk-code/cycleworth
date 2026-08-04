import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { code, userId } = await request.json()

    const params = new URLSearchParams()
    params.append('client_id', process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!)
    params.append('client_secret', process.env.STRAVA_CLIENT_SECRET!)
    params.append('code', code)
    params.append('grant_type', 'authorization_code')

    // 1. 用 code 向 Strava 换取双钥匙
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: 'Strava 授权失败', details: data }, { status: 400 })
    }

    // 2. 连接 Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. 先删除该用户的旧记录，再插入新记录
    await supabase.from('strava_connections').delete().eq('user_id', userId)

    const { error } = await supabase
      .from('strava_connections')
      .insert({
        user_id: userId,
        access_token: data.access_token,
        refresh_token: data.refresh_token
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}