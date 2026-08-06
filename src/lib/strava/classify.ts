export type CommuteSettings = {
  homeStation: string;
  officeStation: string;
  morningStart: number;
  morningEnd: number;
  eveningStart: number;
  eveningEnd: number;
}

export type RideClassification = {
  isSavingsEligible: boolean;
  category: string;
}

// 三大分类判定算法
export function classifyRide(
  startDateStr: string,
  startStation: string,
  endStation: string,
  settings: CommuteSettings
): RideClassification {
  // 用伦敦本地时区（Europe/London）判断星期与小时。
  // Strava 的 start_date 是 UTC，若直接 new Date().getDay()/getHours() 会按
  // 服务器时区（Vercel 默认 UTC）计算，与用户按本地时刻设置的早晚高峰窗口
  // 产生偏差（尤其夏令时/跨时区），导致通勤骑行被漏判。
  const d = new Date(startDateStr)
  const londonParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d)
  const parts = Object.fromEntries(londonParts.map(p => [p.type, p.value]))
  const dayNum = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  const hour = Number(parts.hour) % 24
  const isWeekday = dayNum >= 1 && dayNum <= 5

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
