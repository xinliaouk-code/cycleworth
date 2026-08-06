export type MaintenanceTask = {
  id: string
  task_type: string
  display_name: string
  distance_interval_km: number | null
  time_interval_days: number | null
  last_completed_at: string
  last_completed_odometer_km: number
  estimated_cost: number | null
  notes: string | null
  active: boolean
}

export type MaintenanceStatus = '\u826f\u597d' | '\u5373\u5c06\u5230\u671f' | '\u5230\u671f' | '\u903e\u671f'
export type MaintenanceLanguage = 'en' | 'zh'

const maintenanceNames: Record<string, { en: string; zh: string }> = {
  tyre_pressure: { en: 'Check tyre pressure', zh: '\u68c0\u67e5\u8f6e\u80ce\u6c14\u538b' },
  chain_clean: { en: 'Clean and lubricate chain', zh: '\u6e05\u6d01\u5e76\u6da6\u6ed1\u94fe\u6761' },
  tyre_inspection: { en: 'Inspect tyres for wear and debris', zh: '\u68c0\u67e5\u8f6e\u80ce\u78e8\u635f\u4e0e\u5f02\u7269' },
  brake_pads: { en: 'Inspect brake pads', zh: '\u68c0\u67e5\u5239\u8f66\u7247' },
  chain_wear: { en: 'Check chain wear with a gauge', zh: '\u4f7f\u7528\u94fe\u6761\u5c3a\u68c0\u67e5\u94fe\u6761\u78e8\u635f' },
  safety_check: { en: 'Basic bicycle safety inspection', zh: '\u57fa\u7840\u81ea\u884c\u8f66\u5b89\u5168\u68c0\u67e5' },
  full_service: { en: 'Full bicycle service', zh: '\u5b8c\u6574\u81ea\u884c\u8f66\u4fdd\u517b' },
}

export function maintenanceName(task: Pick<MaintenanceTask, 'task_type' | 'display_name'>, lang: MaintenanceLanguage) {
  return maintenanceNames[task.task_type]?.[lang] ?? task.display_name
}

export function maintenanceStatusText(status: MaintenanceStatus, lang: MaintenanceLanguage) {
  const labels: Record<MaintenanceStatus, { en: string; zh: string }> = {
    '\u826f\u597d': { en: 'Good', zh: '\u826f\u597d' },
    '\u5373\u5c06\u5230\u671f': { en: 'Due soon', zh: '\u5373\u5c06\u5230\u671f' },
    '\u5230\u671f': { en: 'Due', zh: '\u5230\u671f' },
    '\u903e\u671f': { en: 'Overdue', zh: '\u903e\u671f' },
  }
  return labels[status][lang]
}

export function maintenanceProgressColor(ratio: number) {
  if (ratio > 1.2) return '#dc2626'
  const hue = Math.max(18, 120 - (Math.min(ratio, 1.2) / 1.2) * 102)
  return `hsl(${hue} 78% 45%)`
}

export const defaultMaintenanceTasks = [
  ['tyre_pressure', '\u68c0\u67e5\u8f6e\u80ce\u6c14\u538b', null, 7],
  ['chain_clean', '\u6e05\u6d01\u5e76\u6da6\u6ed1\u94fe\u6761', 250, 30],
  ['tyre_inspection', '\u68c0\u67e5\u8f6e\u80ce\u78e8\u635f\u4e0e\u5f02\u7269', 500, 30],
  ['brake_pads', '\u68c0\u67e5\u5239\u8f66\u7247', 750, 90],
  ['chain_wear', '\u4f7f\u7528\u94fe\u6761\u5c3a\u68c0\u67e5\u94fe\u6761\u78e8\u635f', 1000, 180],
  ['safety_check', '\u57fa\u7840\u81ea\u884c\u8f66\u5b89\u5168\u68c0\u67e5', 1000, 180],
  ['full_service', '\u5b8c\u6574\u81ea\u884c\u8f66\u4fdd\u517b', 3000, 365],
] as const

export function maintenanceProgress(task: MaintenanceTask, odometerKm: number) {
  const distanceUsed = task.distance_interval_km
    ? Math.max(0, odometerKm - task.last_completed_odometer_km) / task.distance_interval_km
    : 0
  const daysUsed = task.time_interval_days
    ? Math.max(0, (Date.now() - new Date(task.last_completed_at).getTime()) / 86_400_000) / task.time_interval_days
    : 0
  const ratio = Math.max(distanceUsed, daysUsed)
  const status: MaintenanceStatus = ratio > 1.2 ? '\u903e\u671f' : ratio >= 1 ? '\u5230\u671f' : ratio >= 0.75 ? '\u5373\u5c06\u5230\u671f' : '\u826f\u597d'

  return {
    ratio,
    status,
    kmRemaining: task.distance_interval_km ? Math.max(0, task.distance_interval_km - (odometerKm - task.last_completed_odometer_km)) : null,
    daysRemaining: task.time_interval_days ? Math.max(0, Math.ceil(task.time_interval_days - (Date.now() - new Date(task.last_completed_at).getTime()) / 86_400_000)) : null,
  }
}
