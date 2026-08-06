export type Ride = { id: string; name: string; distance: number; calories?: number | null; moving_time: number; start_date: string; is_commute: boolean; category?: string; is_manual_override?: boolean; start_station?: string; end_station?: string; summary_polyline: string }

export function formatDateCN(dateStr: string) {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? dateStr : `${date.getFullYear()}\u5e74${date.getMonth() + 1}\u6708${date.getDate()}\u65e5`
}

export function getWeekKey(dateStr: string) {
  const date = new Date(dateStr)
  const day = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  return date.toISOString().substring(0, 10)
}

export function calculateROI(rides: Ride[], bikePriceInput: string, commuteCostInput: string, lang: 'en' | 'zh') {
  const commuteCost = Math.max(0, Number.parseFloat(commuteCostInput) || 0)
  const savingsNum = rides.filter(ride => ride.is_commute).length * commuteCost
  const estimatedSavings = savingsNum.toFixed(2)
  const priceNum = Number.parseFloat(bikePriceInput) || 0
  const roiPercentageNum = priceNum > 0 ? (savingsNum / priceNum) * 100 : 0
  let paybackText = ''
  let isFullyPaidBack = false

  if (priceNum <= 0) {
    paybackText = lang === 'zh' ? '\u8bf7\u5148\u8bbe\u7f6e\u81ea\u884c\u8f66\u6210\u672c' : 'Set a bike cost to estimate payback.'
  } else if (savingsNum >= priceNum) {
    isFullyPaidBack = true
    const profit = (savingsNum - priceNum).toFixed(2)
    paybackText = lang === 'zh' ? `\u5df2\u6210\u529f\u56de\u672c\uff01\u51c0\u8282\u7701 £${profit}` : `Paid back! Net savings: £${profit}`
  } else if (commuteCost <= 0) {
    paybackText = lang === 'zh' ? '\u8bf7\u8bbe\u7f6e\u9ed8\u8ba4\u4ea4\u901a\u6210\u672c' : 'Set a default transport cost to estimate payback.'
  } else {
    const remainingRides = Math.ceil((priceNum - savingsNum) / commuteCost)
    const eligibleDates = rides.filter(ride => ride.is_commute && ride.start_date).map(ride => new Date(ride.start_date).getTime()).filter(Number.isFinite)
    const earliest = eligibleDates.length ? Math.min(...eligibleDates) : Date.now() - 7 * 86400000
    const ridesPerDay = eligibleDates.length / Math.max(7, (Date.now() - earliest) / 86400000) || 0.57
    const target = new Date(Date.now() + Math.ceil(remainingRides / ridesPerDay) * 86400000)
    paybackText = lang === 'zh' ? `\u9884\u8ba1 ${target.getFullYear()}\u5e74${target.getMonth() + 1}\u6708 (\u7ea6 ${remainingRides} \u6b21\u9a91\u884c)` : `Estimated ${target.toLocaleString('en-GB', { month: 'short', year: 'numeric' })} (about ${remainingRides} rides)`
  }
  return { estimatedSavings, roiPercentageNum, roiPercentageStr: roiPercentageNum.toFixed(1), paybackText, isFullyPaidBack }
}

export function prepareChartData(rides: Ride[], commuteCostInput: string) {
  const commuteCost = Math.max(0, Number.parseFloat(commuteCostInput) || 0)
  const weeks = new Map<string, { distance: number; savings: number }>()
  rides.forEach(ride => { if (!ride.start_date) return; const key = getWeekKey(ride.start_date); const value = weeks.get(key) || { distance: 0, savings: 0 }; value.distance += (ride.distance || 0) / 1000; if (ride.is_commute) value.savings += commuteCost; weeks.set(key, value) })
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([shortWeek, value]) => ({ shortWeek, distance: Number(value.distance.toFixed(1)), savings: Number(value.savings.toFixed(2)) }))
}
