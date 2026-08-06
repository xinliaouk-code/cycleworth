import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySession } from '../../../../lib/auth'
import { getNearestStation } from '../../../../lib/strava/stations'
import { classifyRide, CommuteSettings } from '../../../../lib/strava/classify'

type RidesRow = {
  id: string;
  strava_activity_id: number | null;
  name: string | null;
  start_date: string | null;
  is_manual_override: boolean;
}

export async function POST(request: Request) {
  try {
    const {
      accessToken,
      homeStation = 'Custom House, Royal Victoria',
      officeStation = 'Bank, Old Street',
      morningStart = 7,
      morningEnd = 10,
      eveningStart = 16,
      eveningEnd = 20
    } = await request.json()

    // 🔐 服务端校验会话，杜绝客户端伪造/越权（user_id 一律以登录态为准）
    const userId = await verifySession(accessToken)
    if (!userId) {
      return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 })
    }

    const settings: CommuteSettings = {
      homeStation,
      officeStation,
      morningStart: Number(morningStart),
      morningEnd: Number(morningEnd),
      eveningStart: Number(eveningStart),
      eveningEnd: Number(eveningEnd)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: conn } = await supabase
      .from('strava_connections')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .maybeSingle()

    if (!conn) {
      return NextResponse.json({ error: '未找到 Strava 连接信息' }, { status: 400 })
    }

    let currentAccessToken = conn.access_token

    const testRes = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=1',
      { headers: { Authorization: `Bearer ${currentAccessToken}` } }
    )

    if (testRes.status === 401 && conn.refresh_token) {
      const refreshRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!,
          client_secret: process.env.STRAVA_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: conn.refresh_token
        }).toString()
      })

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        currentAccessToken = refreshData.access_token

        await supabase
          .from('strava_connections')
          .update({
            access_token: currentAccessToken,
            refresh_token: refreshData.refresh_token || conn.refresh_token,
          })
          .eq('user_id', userId)
      }
    }

    // ── 改动 5：增量同步 ──
    // 先取该用户已同步的最新活动时间作为基线，只拉取其后的新增 Strava 活动。
    const { data: latestRow } = await supabase
      .from('rides')
      .select('start_date')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastSyncedAt = latestRow?.start_date
      ? new Date(latestRow.start_date).getTime() / 1000
      : undefined

    let page = 1
    const perPage = 100
    const allActivities: any[] = []
    let reachedBaseline = false

    while (!reachedBaseline) {
      let url = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`
      // Strava 支持 after（epoch 秒）。有基线时用它只拉增量，大幅减少翻页与 API 配额。
      if (lastSyncedAt) url += `&after=${Math.floor(lastSyncedAt)}`

      const stravaRes = await fetch(url, {
        headers: { Authorization: `Bearer ${currentAccessToken}` }
      })

      if (!stravaRes.ok) break
      const activities = await stravaRes.json()
      if (!Array.isArray(activities) || activities.length === 0) break

      allActivities.push(...activities)
      if (activities.length < perPage || !lastSyncedAt) break

      // 兜底：即使未用 after，也尽早停在与基线重叠的旧活动上，避免拉全量。
      reachedBaseline = activities.some(
        (a: any) => a.start_date && new Date(a.start_date).getTime() / 1000 <= lastSyncedAt
      )
      page++
    }

    if (allActivities.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: '没有需要同步的新活动' })
    }

    // 查询已有记录（包含 is_manual_override）
    const { data: existingRides } = await supabase
      .from('rides')
      .select('id, strava_activity_id, name, start_date, is_manual_override')
      .eq('user_id', userId)

    const existingByActivityId = new Map<number, RidesRow>()
    const existingByKey = new Map<string, RidesRow>()

    if (existingRides) {
      existingRides.forEach((r: any) => {
        if (r.strava_activity_id != null) existingByActivityId.set(r.strava_activity_id, r)
        if (r.name && r.start_date) existingByKey.set(`${r.name}_${r.start_date}`, r)
      })
    }

    // ── 改动 4：批量写入（收集后一次 upsert / 一次 insert） ──
    const rowsToUpdate: any[] = []
    const rowsToInsert: any[] = []

    for (const act of allActivities) {
      if (act.type !== 'Ride' && act.type !== 'EBikeRide') continue

      const startLat = act.start_latlng?.[0]
      const startLng = act.start_latlng?.[1]
      const endLat = act.end_latlng?.[0]
      const endLng = act.end_latlng?.[1]

      const startStation = getNearestStation(startLat, startLng)
      const endStation = getNearestStation(endLat, endLng)
      const summaryPolyline = act.map?.summary_polyline || null

      const fallbackKey = `${act.name}_${act.start_date}`
      const matchedRecord = existingByActivityId.get(act.id) || existingByKey.get(fallbackKey)

      const { isSavingsEligible, category } = classifyRide(act.start_date, startStation, endStation, settings)

      const baseFields = {
        name: act.name,
        distance: act.distance,
        moving_time: act.moving_time,
        elapsed_time: act.elapsed_time,
        type: act.type,
        start_date: act.start_date,
        start_station: startStation,
        end_station: endStation,
        summary_polyline: summaryPolyline,
        strava_activity_id: act.id
      }

      if (matchedRecord) {
        // 🛡️ 保留手动覆盖：用户曾手改的，不重写分类
        const updateData: any = { ...baseFields }
        if (!matchedRecord.is_manual_override) {
          updateData.is_commute = isSavingsEligible
          updateData.category = category
        }
        updateData.id = matchedRecord.id
        rowsToUpdate.push(updateData)
      } else {
        rowsToInsert.push({
          ...baseFields,
          user_id: userId,
          is_commute: isSavingsEligible,
          category,
          is_manual_override: false
        })
      }
    }

    // 批量 upsert：一次请求更新所有已存在的骑行
    if (rowsToUpdate.length > 0) {
      const { error } = await supabase.from('rides').upsert(rowsToUpdate)
      if (error) throw error
    }

    // 批量 insert：一次请求插入所有新增骑行
    if (rowsToInsert.length > 0) {
      const { error } = await supabase.from('rides').insert(rowsToInsert)
      if (error) throw error
    }

    const syncedCount = rowsToUpdate.length + rowsToInsert.length

    return NextResponse.json({ success: true, count: syncedCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
