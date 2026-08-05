export type Ride = {
  id: string;
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
  is_commute: boolean;
  category?: string;
  is_manual_override?: boolean;
  start_station?: string;
  end_station?: string;
  summary_polyline: string;
}

export function formatDateCN(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function getWeekKey(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().substring(0, 10)
}

export function calculateROI(rides: Ride[], bikePriceInput: string) {
  const commuteRidesCount = rides.filter(r => r.is_commute).length
  const estimatedSavings = (commuteRidesCount * 3.90).toFixed(2)
  const savingsNum = Number(estimatedSavings)
  const priceNum = parseFloat(bikePriceInput) || 0
  const roiPercentageNum = priceNum > 0 ? (savingsNum / priceNum) * 100 : 0
  
  let paybackText = ''
  let isFullyPaidBack = false

  if (priceNum <= 0) {
    paybackText = '请在右上角设置购车金额'
  } else if (savingsNum >= priceNum) {
    isFullyPaidBack = true
    const profit = (savingsNum - priceNum).toFixed(2)
    paybackText = `已成功回本！🎉 (净收益 £${profit})`
  } else {
    const remainingAmount = priceNum - savingsNum
    const remainingRides = Math.ceil(remainingAmount / 3.90)
    
    const eligibleDates = rides
      .filter(r => r.is_commute && r.start_date)
      .map(r => new Date(r.start_date).getTime())
      .filter(t => !isNaN(t))

    let ridesPerDay = 0.57
    if (eligibleDates.length > 0) {
      const earliestTime = Math.min(...eligibleDates)
      const nowTime = Date.now()
      const diffDays = Math.max(7, (nowTime - earliestTime) / (1000 * 60 * 60 * 24))
      ridesPerDay = eligibleDates.length / diffDays
    }

    const daysNeeded = Math.ceil(remainingRides / (ridesPerDay || 0.57))
    const targetDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000)
    const targetYear = targetDate.getFullYear()
    const targetMonth = targetDate.getMonth() + 1

    paybackText = `预计 ${targetYear}年${targetMonth}月 (约 ${remainingRides} 次骑行)`
  }

  return {
    estimatedSavings,
    roiPercentageNum,
    roiPercentageStr: roiPercentageNum.toFixed(1),
    paybackText,
    isFullyPaidBack
  }
}

export function prepareChartData(rides: Ride[]) {
  const weeklyMap = new Map<string, { distance: number; savings: number; count: number }>()
  rides.forEach(r => {
    if (!r.start_date) return
    const weekKey = getWeekKey(r.start_date)
    const curr = weeklyMap.get(weekKey) || { distance: 0, savings: 0, count: 0 }
    curr.distance += (r.distance || 0) / 1000
    if (r.is_commute) curr.savings += 3.90
    curr.count += 1
    weeklyMap.set(weekKey, curr)
  })

  return Array.from(weeklyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, val]) => ({
      shortWeek: week,
      distance: Number(val.distance.toFixed(1)),
      savings: Number(val.savings.toFixed(2)),
      count: val.count
    }))
}
