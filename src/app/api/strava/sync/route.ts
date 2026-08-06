import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySession } from '../../../../lib/auth'

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
  { name: "Old Street", lat: 51.5255, lng: -0.0879 },

  // --- Northern Line ---
  { name: "High Barnet", lat: 51.6506, lng: -0.1943 },
  { name: "Totteridge & Whetstone", lat: 51.6302, lng: -0.1791 },
  { name: "Woodside Park", lat: 51.6179, lng: -0.1856 },
  { name: "West Finchley", lat: 51.6095, lng: -0.1883 },
  { name: "Finchley Central", lat: 51.6012, lng: -0.1932 },
  { name: "Mill Hill East", lat: 51.6082, lng: -0.2103 },
  { name: "East Finchley", lat: 51.5871, lng: -0.165 },
  { name: "Highgate", lat: 51.5777, lng: -0.1458 },
  { name: "Archway", lat: 51.5653, lng: -0.1353 },
  { name: "Tufnell Park", lat: 51.5567, lng: -0.1374 },
  { name: "Kentish Town", lat: 51.5507, lng: -0.1402 },
  { name: "Camden Town", lat: 51.5392, lng: -0.1426 },
  { name: "Mornington Crescent", lat: 51.5342, lng: -0.1387 },
  { name: "Euston", lat: 51.5282, lng: -0.1337 },
  { name: "Warren Street", lat: 51.5247, lng: -0.1384 },
  { name: "Goodge Street", lat: 51.5205, lng: -0.1347 },
  { name: "Leicester Square", lat: 51.5111, lng: -0.1282 },
  { name: "Charing Cross", lat: 51.5083, lng: -0.1247 },
  { name: "Embankment", lat: 51.5074, lng: -0.1223 },
  { name: "Kennington", lat: 51.4886, lng: -0.1052 },
  { name: "Oval", lat: 51.4819, lng: -0.113 },
  { name: "Stockwell", lat: 51.4723, lng: -0.123 },
  { name: "Clapham North", lat: 51.4652, lng: -0.1299 },
  { name: "Clapham Common", lat: 51.4618, lng: -0.1382 },
  { name: "Clapham South", lat: 51.4527, lng: -0.148 },
  { name: "Balham", lat: 51.4431, lng: -0.1525 },
  { name: "Tooting Bec", lat: 51.4361, lng: -0.1597 },
  { name: "Tooting Broadway", lat: 51.4274, lng: -0.1681 },
  { name: "Colliers Wood", lat: 51.4187, lng: -0.1779 },
  { name: "South Wimbledon", lat: 51.4154, lng: -0.1921 },
  { name: "Morden", lat: 51.4022, lng: -0.1948 },
  { name: "Borough", lat: 51.5012, lng: -0.0934 },
  { name: "Elephant & Castle", lat: 51.4944, lng: -0.1003 },

  // --- Victoria Line ---
  { name: "Walthamstow Central", lat: 51.5831, lng: -0.0199 },
  { name: "Blackhorse Road", lat: 51.5867, lng: -0.0417 },
  { name: "Tottenham Hale", lat: 51.5882, lng: -0.0594 },
  { name: "Seven Sisters", lat: 51.5826, lng: -0.0749 },
  { name: "Finsbury Park", lat: 51.5642, lng: -0.1065 },
  { name: "Highbury & Islington", lat: 51.5461, lng: -0.104 },
  { name: "Pimlico", lat: 51.4893, lng: -0.1334 },
  { name: "Brixton", lat: 51.4627, lng: -0.1146 },

  // --- Central Line ---
  { name: "West Ruislip", lat: 51.5696, lng: -0.4376 },
  { name: "Ruislip Gardens", lat: 51.5606, lng: -0.4103 },
  { name: "South Ruislip", lat: 51.5569, lng: -0.3988 },
  { name: "Northolt", lat: 51.5483, lng: -0.3687 },
  { name: "Greenford", lat: 51.5423, lng: -0.3456 },
  { name: "Perivale", lat: 51.5366, lng: -0.3232 },
  { name: "Hanger Lane", lat: 51.5302, lng: -0.2933 },
  { name: "West Acton", lat: 51.518, lng: -0.2809 },
  { name: "North Acton", lat: 51.5237, lng: -0.2597 },
  { name: "East Acton", lat: 51.5168, lng: -0.2474 },
  { name: "White City", lat: 51.512, lng: -0.224 },
  { name: "Shepherd's Bush", lat: 51.5046, lng: -0.2187 },
  { name: "Holland Park", lat: 51.5072, lng: -0.2059 },
  { name: "Notting Hill Gate", lat: 51.5094, lng: -0.1967 },
  { name: "Queensway", lat: 51.5104, lng: -0.1875 },
  { name: "Lancaster Gate", lat: 51.5119, lng: -0.1756 },
  { name: "Marble Arch", lat: 51.5136, lng: -0.1586 },
  { name: "Chancery Lane", lat: 51.5185, lng: -0.1111 },
  { name: "St. Paul's", lat: 51.5146, lng: -0.0973 },
  { name: "Bethnal Green", lat: 51.527, lng: -0.0549 },
  { name: "Mile End", lat: 51.5249, lng: -0.0333 },
  { name: "Leyton", lat: 51.5566, lng: -0.0053 },
  { name: "Leytonstone", lat: 51.5683, lng: 0.0083 },
  { name: "Wanstead", lat: 51.5775, lng: 0.0288 },
  { name: "Redbridge", lat: 51.5763, lng: 0.0454 },
  { name: "Gants Hill", lat: 51.5765, lng: 0.0663 },
  { name: "Newbury Park", lat: 51.5756, lng: 0.0894 },
  { name: "Barkingside", lat: 51.5856, lng: 0.0887 },
  { name: "Fairlop", lat: 51.596, lng: 0.0912 },
  { name: "Hainault", lat: 51.6036, lng: 0.0934 },
  { name: "Snaresbrook", lat: 51.5808, lng: 0.0216 },
  { name: "South Woodford", lat: 51.5917, lng: 0.0275 },
  { name: "Woodford", lat: 51.607, lng: 0.0341 },
  { name: "Buckhurst Hill", lat: 51.6266, lng: 0.047 },
  { name: "Loughton", lat: 51.6412, lng: 0.0558 },
  { name: "Debden", lat: 51.6455, lng: 0.0839 },
  { name: "Theydon Bois", lat: 51.6718, lng: 0.1033 },
  { name: "Epping", lat: 51.6937, lng: 0.1139 },
  { name: "Grange Hill", lat: 51.6135, lng: 0.0923 },
  { name: "Chigwell", lat: 51.6177, lng: 0.0755 },
  { name: "Roding Valley", lat: 51.6171, lng: 0.0439 },
]

// 地球半径（公里）
const EARTH_RADIUS_KM = 6371

/**
 * 计算两个经纬度点之间的球面距离（Haversine 公式），单位：公里。
 * 相比平面欧氏距离，在伦敦所在的高纬度地区不会因经度压缩而失准。
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/** 用 Haversine 球面距离取最近的站点（站点匹配更精准） */
function getNearestStation(lat?: number, lng?: number): string {
  if (lat == null || lng == null) return '未知起点'
  let nearest = TUBE_STATIONS[0]
  let minDistance = Infinity

  for (const station of TUBE_STATIONS) {
    const dist = haversineDistance(lat, lng, station.lat, station.lng)
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
