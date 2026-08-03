import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    // 1. 初始化服务端 Supabase 客户端（跳过客户端限制）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. 从金库取出当前用户的 Strava 通行证
    const { data: conn } = await supabase
      .from('strava_connections')
      .select('access_token')
      .eq('user_id', userId)
      .single()

    if (!conn) {
      return NextResponse.json({ error: '未找到 Strava 连接信息' }, { status: 400 })
    }

    // 3. 向 Strava 官方 API 发起请求，拉取最近 30 条骑行记录
    const stravaRes = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=30',
      {
        headers: {
          Authorization: `Bearer ${conn.access_token}`
        }
      }
    )

    const activities = await stravaRes.json()

    if (!Array.isArray(activities)) {
      return NextResponse.json({ error: '从 Strava 获取数据失败', details: activities }, { status: 500 })
    }

    // 4. 清洗数据并批量写入 Supabase 数据库
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