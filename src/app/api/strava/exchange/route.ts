import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { code, userId } = await request.json()

    // 1. 用 code 向 Strava 换取真正的双钥匙
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      })
    })

    if (!res.ok) {
        const err = await res.json()
        return NextResponse.json({ error: 'Strava 授权失败', details: err }, { status: 400 })
    }

    const data = await res.json()

    // 2. 连接 Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 3. 终极防错策略：先删除该用户的旧记录，再插入新记录，彻底避免重复行报错
    await supabase.from('strava_connections').delete().eq('user_id', userId);

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