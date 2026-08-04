import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '请求中缺少 userId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. 获取连接信息
    const { data: conn, error: connError } = await supabase
      .from('strava_connections')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .maybeSingle() // 用 maybeSingle 防止多行或无行时报错

    if (connError || !conn) {
      return NextResponse.json({ 
        error: '未找到 Strava 连接信息', 
        details: connError?.message || '表里没有该用户的记录，请尝试重新点击“连接 Strava”' 
      }, { status: 400 })
    }

    let currentAccessToken = conn.access_token

    // 2. 尝试向 Strava 拉取数据
    let stravaRes = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=30',
      {
        headers: { Authorization: `Bearer ${currentAccessToken}` }
      }
    )

    // 3. 如果 Token 过期 (401)，自动刷新
    if (stravaRes.status === 401 && conn.refresh_token) {
      const refreshRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token
        })
      })

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        currentAccessToken = refreshData.access_token

        // 更新数据库中的新 Token
        await supabase
          .from('strava_connections')
          .update({
            access_token: currentAccessToken,
            refresh_token: refreshData.refresh_token || conn.refresh_token,
          })
          .eq('user_id', userId)

        // 重新发起拉取
        stravaRes = await fetch(
          'https://www.strava.com/api/v3/athlete/activities?per_page=30',
          {
            headers: { Authorization: `Bearer ${currentAccessToken}` }
          }
        )
      }
    }

    const activities = await stravaRes.json()

    if (!Array.isArray(activities)) {
      return NextResponse.json({ error: '从 Strava 获取数据失败', details: activities }, { status: 500 })
    }

    // 4. 写入数据库
    const ridesToInsert = activities
      .filter((act: any) => act.type === 'Ride' || act.type === 'EBikeRide')
      .map((act: any) => ({
        user_id: userId,
        strava_activity_id: act.id,
        name: act.name,
        distance: act.distance,
        moving_time: act.moving_time,
        elapsed_time: act.elapsed_time,
        type: act.type,
        start_date: act.start_date,
        is_commute: act.commute || false
      }))

    if (ridesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('rides')
        .upsert(ridesToInsert, { onConflict: 'strava_activity_id' })

      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true, count: ridesToInsert.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}