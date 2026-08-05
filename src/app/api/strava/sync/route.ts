import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TUBE_STATIONS = [
  // --- Jubilee Line ---
  { name: "Stanmore", lat: 51.6195, lng: -0.3041 },
  { name: "Canons Park", lat: 51.6074, lng: -0.2905 },
  { name: "Queensbury", lat: 51.5936, lng: -0.2831 },
  { name: "Kingsbury", lat: 51.5833, lng: -0.2783 },
  { name: "Wembley Park", lat: 51.5635, lng: -0.2796 },
  { name: "Neasden", lat: 51.5542, lng: -0.2471 },
  { name: "Dollis Hill", lat: 51.5516, lng: -0.2372 },
  { name: "Willesden Green", lat: 51.5490, lng: -0.2212 },
  { name: "Kilburn", lat: 51.5434, lng: -0.1983 },
  { name: "West Hampstead", lat: 51.5463, lng: -0.1912 },
  { name: "Finchley Road", lat: 51.5469, lng: -0.1807 },
  { name: "Swiss Cottage", lat: 51.5427, lng: -0.1738 },
  { name: "St. John's Wood", lat: 51.5342, lng: -0.1742 },
  { name: "Baker Street", lat: 51.5226, lng: -0.1571 },
  { name: "Bond Street", lat: 51.5142, lng: -0.1493 },
  { name: "Green Park", lat: 51.5070, lng: -0.1427 },
  { name: "Westminster", lat: 51.5014, lng: -0.1248 },
  { name: "Waterloo", lat: 51.5033, lng: -0.1145 },
  { name: "Southwark", lat: 51.5037, lng: -0.1070 },
  { name: "London Bridge", lat: 51.5055, lng: -0.0865 },
  { name: "Bermondsey", lat: 51.4979, lng: -0.0635 },
  { name: "Canada Water", lat: 51.4979, lng: -0.0506 },
  { name: "Canary Wharf", lat: 51.5054, lng: -0.0202 },
  { name: "North Greenwich", lat: 51.5003, lng: 0.0040 },
  { name: "Canning Town", lat: 51.5135, lng: 0.0084 },
  { name: "West Ham", lat: 51.5283, lng: 0.0075 },
  { name: "Stratford", lat: 51.5413, lng: -0.0032 },

  // --- Elizabeth Line ---
  { name: "Reading", lat: 51.4584, lng: -0.9709 },
  { name: "Twyford", lat: 51.4795, lng: -0.8653 },
  { name: "Maidenhead", lat: 51.5204, lng: -0.7225 },
  { name: "Taplow", lat: 51.5197, lng: -0.6865 },
  { name: "Burnham", lat: 51.5186, lng: -0.6485 },
  { name: "Slough", lat: 51.5126, lng: -0.5901 },
  { name: "Langley", lat: 51.5098, lng: -0.5375 },
  { name: "Iver", lat: 51.5094, lng: -0.4939 },
  { name: "West Drayton", lat: 51.5117, lng: -0.4674 },
  { name: "Hayes & Harlington", lat: 51.5078, lng: -0.4283 },
  { name: "Southall", lat: 51.5101, lng: -0.3804 },
  { name: "Hanwell", lat: 51.5119, lng: -0.3421 },
  { name: "West Ealing", lat: 51.5136, lng: -0.3180 },
  { name: "Ealing Broadway", lat: 51.5152, lng: -0.3025 },
  { name: "Acton Main Line", lat: 51.5192, lng: -0.2642 },
  { name: "Paddington", lat: 51.5154, lng: -0.1755 },
  { name: "Tottenham Court Road", lat: 51.5160, lng: -0.1303 },
  { name: "Farringdon", lat: 51.5202, lng: -0.1047 },
  { name: "Liverpool Street", lat: 51.5178, lng: -0.0823 },
  { name: "Whitechapel", lat: 51.5198, lng: -0.0607 },
  { name: "Maryland", lat: 51.5451, lng: 0.0049 },
  { name: "Forest Gate", lat: 51.5471, lng: 0.0232 },
  { name: "Manor Park", lat: 51.5501, lng: 0.0401 },
  { name: "Ilford", lat: 51.5562, lng: 0.0718 },
  { name: "Seven Kings", lat: 51.5604, lng: 0.0954 },
  { name: "Goodmayes", lat: 51.5630, lng: 0.1158 },
  { name: "Chadwell Heath", lat: 51.5663, lng: 0.1384 },
  { name: "Romford", lat: 51.5746, lng: 0.1834 },
  { name: "Gidea Park", lat: 51.5804, lng: 0.2078 },
  { name: "Harold Wood", lat: 51.5866, lng: 0.2393 },
  { name: "Brentwood", lat: 51.6146, lng: 0.2987 },
  { name: "Shenfield", lat: 51.6251, lng: 0.3341 },
  { name: "Heathrow Terminal 4", lat: 51.4580, lng: -0.4480 },
  { name: "Heathrow Terminal 5", lat: 51.4720, lng: -0.4590 },
  { name: "Heathrow Central", lat: 51.4700, lng: -0.4530 },
  { name: "Abbey Wood", lat: 51.4908, lng: 0.1206 },
  { name: "Woolwich", lat: 51.4912, lng: 0.0736 },
  { name: "Custom House", lat: 51.5106, lng: 0.0234 },

  // --- DLR ---
  { name: "Bank", lat: 51.5134, lng: -0.0890 },
  { name: "Shadwell", lat: 51.5113, lng: -0.0573 },
  { name: "Limehouse", lat: 51.5131, lng: -0.0396 },
  { name: "Westferry", lat: 51.5090, lng: -0.0267 },
  { name: "Poplar", lat: 51.5082, lng: -0.0152 },
  { name: "All Saints", lat: 51.5126, lng: -0.0142 },
  { name: "Langdon Park", lat: 51.5186, lng: -0.0125 },
  { name: "Devons Road", lat: 51.5235, lng: -0.0123 },
  { name: "Bow Church", lat: 51.5262, lng: -0.0163 },
  { name: "DLR Canary Wharf", lat: 51.5049, lng: -0.0179 },
  { name: "Heron Quays", lat: 51.5029, lng: -0.0185 },
  { name: "South Quay", lat: 51.4996, lng: -0.0165 },
  { name: "Crossharbour", lat: 51.4957, lng: -0.0135 },
  { name: "Mudchute", lat: 51.4920, lng: -0.0147 },
  { name: "Island Gardens", lat: 51.4871, lng: -0.0129 },
  { name: "Cutty Sark", lat: 51.4820, lng: -0.0108 },
  { name: "Greenwich DLR", lat: 51.4779, lng: -0.0132 },
  { name: "Deptford Bridge", lat: 51.4764, lng: -0.0255 },
  { name: "Elverson Road", lat: 51.4726, lng: -0.0197 },
  { name: "Lewisham", lat: 51.4655, lng: -0.0132 },
  { name: "West India Quay", lat: 51.5076, lng: -0.0223 },
  { name: "Blackwall", lat: 51.5103, lng: -0.0048 },
  { name: "East India", lat: 51.5119, lng: 0.0028 },
  { name: "Royal Victoria", lat: 51.5097, lng: 0.0178 },
  { name: "Prince Regent", lat: 51.5112, lng: 0.0343 },
  { name: "Royal Albert", lat: 51.5082, lng: 0.0504 },
  { name: "Beckton Park", lat: 51.5108, lng: 0.0637 },
  { name: "Gallions Reach", lat: 51.5134, lng: 0.0772 },
  { name: "Beckton", lat: 51.5184, lng: 0.0658 },
  { name: "London City Airport", lat: 51.5039, lng: 0.0483 },
  { name: "Pudding Mill Lane", lat: 51.5348, lng: -0.0094 },
  { name: "Tower Gateway", lat: 51.5106, lng: -0.0734 },

  // --- Other Key Central London Nodes ---
  { name: "King's Cross St. Pancras", lat: 51.5305, lng: -0.1233 },
  { name: "Victoria", lat: 51.4952, lng: -0.1439 },
  { name: "Oxford Circus", lat: 51.5152, lng: -0.1419 },
  { name: "Holborn", lat: 51.5174, lng: -0.1200 },
  { name: "Piccadilly Circus", lat: 51.5098, lng: -0.1342 },
  { name: "Vauxhall", lat: 51.4862, lng: -0.1225 },
  { name: "Angel", lat: 51.5322, lng: -0.1058 },
  { name: "Old Street", lat: 51.5255, lng: -0.0879 }
]

function getNearestStation(lat?: number, lng?: number): string {
  if (!lat || !lng) return '未知起点'
  let nearest = TUBE_STATIONS[0]
  let minDistance = Infinity

  for (const station of TUBE_STATIONS) {
    const dist = Math.pow(station.lat - lat, 2) + Math.pow(station.lng - lng, 2)
    if (dist < minDistance) {
      minDistance = dist
      nearest = station
    }
  }
  return nearest.name
}

type CommuteSettings = {
  homeStation: string;
  officeStation: string;
  morningStart: number;
  morningEnd: number;
  eveningStart: number;
  eveningEnd: number;
}

// 三大分类判定算法
function classifyRide(
  startDateStr: string,
  startStation: string,
  endStation: string,
  settings: CommuteSettings
): { isSavingsEligible: boolean; category: string } {
  const d = new Date(startDateStr)
  const day = d.getDay()
  const hour = d.getHours()
  const isWeekday = day >= 1 && day <= 5

  const homeList = settings.homeStation
    .split(/[,，]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  const officeList = settings.officeStation
    .split(/[,，]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  const start = startStation.toLowerCase().trim()
  const end = endStation.toLowerCase().trim()

  const isHomeStart = homeList.some(h => start.includes(h) || h.includes(start))
  const isOfficeEnd = officeList.some(o => end.includes(o) || o.includes(end))
  
  const isOfficeStart = officeList.some(o => start.includes(o) || o.includes(start))
  const isHomeEnd = homeList.some(h => end.includes(h) || h.includes(end))

  const isMorningTime = hour >= settings.morningStart && hour < settings.morningEnd
  const isEveningTime = hour >= settings.eveningStart && hour < settings.eveningEnd

  const isMorningCommute = isWeekday && isMorningTime && isHomeStart && isOfficeEnd
  const isEveningCommute = isWeekday && isEveningTime && isOfficeStart && isHomeEnd

  // 1. 通勤骑行 (算钱)
  if (isMorningCommute || isEveningCommute) {
    return { isSavingsEligible: true, category: '通勤骑行' }
  }

  // 2. 日常交通 (算钱)
  if (startStation !== endStation && startStation !== '未知起点' && endStation !== '未知起点') {
    return { isSavingsEligible: true, category: '日常交通' }
  }

  // 3. 休闲骑行 (不算钱)
  return { isSavingsEligible: false, category: '休闲骑行' }
}

export async function POST(request: Request) {
  try {
    const { 
      userId, 
      homeStation = 'Custom House, Royal Victoria', 
      officeStation = 'Bank, Old Street',
      morningStart = 7,
      morningEnd = 10,
      eveningStart = 16,
      eveningEnd = 20
    } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: '请求中缺少 userId' }, { status: 400 })
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

    let testRes = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=1',
      { headers: { Authorization: `Bearer ${currentAccessToken}` } }
    )

    if (testRes.status === 401 && conn.refresh_token) {
      const refreshRes = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!,
          client_secret: process.env.NEXT_PUBLIC_STRAVA_CLIENT_SECRET!,
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

    let page = 1
    const perPage = 100 
    let allActivities: any[] = []

    while (true) {
      const stravaRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
        { headers: { Authorization: `Bearer ${currentAccessToken}` } }
      )

      if (!stravaRes.ok) break
      const activities = await stravaRes.json()
      if (!Array.isArray(activities) || activities.length === 0) break

      allActivities = allActivities.concat(activities)
      if (activities.length < perPage) break
      page++
    }

    if (allActivities.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: '没有获取到任何 Strava 活动' })
    }

    // 查询已有记录（包含 is_manual_override）
    const { data: existingRides } = await supabase
      .from('rides')
      .select('id, strava_activity_id, name, start_date, is_manual_override')
      .eq('user_id', userId)

    const existingByActivityId = new Map<number, any>()
    const existingByKey = new Map<string, any>()

    if (existingRides) {
      existingRides.forEach((r: any) => {
        if (r.strava_activity_id != null) existingByActivityId.set(r.strava_activity_id, r)
        if (r.name && r.start_date) existingByKey.set(`${r.name}_${r.start_date}`, r)
      })
    }

    let syncedCount = 0

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

      if (matchedRecord) {
        const updateData: any = {
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

        // 🛡️ 核心修复：如果用户未曾手动覆盖，才使用算法判定的分类；否则严格保留用户手改结果
        if (!matchedRecord.is_manual_override) {
          updateData.is_commute = isSavingsEligible
          updateData.category = category
        }

        await supabase
          .from('rides')
          .update(updateData)
          .eq('id', matchedRecord.id)
      } else {
        await supabase
          .from('rides')
          .insert({
            user_id: userId,
            strava_activity_id: act.id,
            name: act.name,
            distance: act.distance,
            moving_time: act.moving_time,
            elapsed_time: act.elapsed_time,
            type: act.type,
            start_date: act.start_date,
            is_commute: isSavingsEligible,
            category: category,
            is_manual_override: false,
            start_station: startStation,
            end_station: endStation,
            summary_polyline: summaryPolyline
          })
      }
      syncedCount++
    }

    return NextResponse.json({ success: true, count: syncedCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}