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
