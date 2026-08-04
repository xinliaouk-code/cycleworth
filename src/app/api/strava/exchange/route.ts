import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { code, userId } = await request.json()

    // 关键修复：Strava OAuth 必须使用表单 (URLSearchParams) 格式发送请求
    const params = new URLSearchParams()
    params.append('client_id', process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!)
    params.append('client_secret', process.env.STRAVA_CLIENT_SECRET!)
    params.append('code', code)
    params.append('grant_type', 'authorization_code')

    // 1. 用 code 向 Strava 换取真正的双钥匙
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

    // 3. 先删除该用户的旧记录，再插入新记录，彻底避免重复行冲突
    await supabase.from('strava_connections').delete().eq('user_id', userId)

    const { error } = await supabase
      .from('strava_connections')
      .insert({
        user_id: userId,
        athlete_id: data.athlete.id,
        access_token: data.access_token,
        refresh_token: data.refresh_token
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}