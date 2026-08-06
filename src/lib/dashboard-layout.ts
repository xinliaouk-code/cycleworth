export const dashboardSections = ['advice', 'stats', 'maintenance', 'weekly', 'roi', 'settings', 'sync', 'chart', 'rides'] as const
export type DashboardSection = typeof dashboardSections[number]
export type DashboardLayout = { order: DashboardSection[]; hidden: DashboardSection[] }
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = { order: [...dashboardSections], hidden: [] }

export function parseDashboardLayout(value: unknown): DashboardLayout {
  if (!value || typeof value !== 'object') return DEFAULT_DASHBOARD_LAYOUT
  const saved = value as Partial<DashboardLayout>
  const order = Array.isArray(saved.order) ? saved.order.filter((item): item is DashboardSection => dashboardSections.includes(item as DashboardSection)) : []
  return { order: [...order, ...dashboardSections.filter(item => !order.includes(item))], hidden: Array.isArray(saved.hidden) ? saved.hidden.filter((item): item is DashboardSection => dashboardSections.includes(item as DashboardSection)) : [] }
}
