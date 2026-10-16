import type { DashboardSection } from './dashboard-layout'
export const navigationIds = ['overview', 'rides', 'bike', 'trends', 'sync', 'settings'] as const
export type NavigationId = typeof navigationIds[number]
export const DEFAULT_NAVIGATION: NavigationId[] = ['overview', 'rides', 'bike', 'trends']
export const navigationLabels = {
  overview: { zh: '概览', en: 'Overview' }, rides: { zh: '骑行', en: 'Rides' },
  bike: { zh: '爱车', en: 'My bike' }, trends: { zh: '趋势', en: 'Trends' },
  sync: { zh: '同步', en: 'Sync' }, settings: { zh: '设置', en: 'Settings' },
}
export const viewSections: Record<string, DashboardSection[]> = {
  overview: ['stats', 'advice', 'sync'], rides: ['rides', 'settings'],
  bike: ['roi', 'maintenance'], trends: ['weekly', 'chart'],
}
export function validNavigation(value: unknown): value is NavigationId[] {
  return Array.isArray(value) && value.length === 4 && new Set(value).size === 4 && value.every(id => navigationIds.includes(id))
}
export function parseNavigation(value: unknown): NavigationId[] {
  return validNavigation(value) ? [...value] : [...DEFAULT_NAVIGATION]
}
export function navigationHref(id: NavigationId, demo = false) {
  if (id === 'settings') return '/settings'
  if (id === 'sync') return '/settings/health'
  return `/dashboard?view=${id}${demo ? '&demo=true' : ''}`
}
