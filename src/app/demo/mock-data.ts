import type { MaintenanceTask } from '../../lib/maintenance'
import type { Ride } from '../dashboard/_lib/utils'

const daysAgo = (days: number, hour: number) => {
  const value = new Date()
  value.setDate(value.getDate() - days)
  value.setHours(hour, 30, 0, 0)
  return value.toISOString()
}

export const demoRides: Ride[] = [
  { id: 'demo-1', name: 'Morning commute', distance: 8200, calories: 318, moving_time: 1740, start_date: daysAgo(1, 8), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-2', name: 'Canal loop', distance: 14600, calories: 542, moving_time: 3120, start_date: daysAgo(3, 11), is_commute: false, category: '休闲骑行', start_station: 'Victoria Park', end_station: 'Hackney Wick', summary_polyline: '' },
  { id: 'demo-3', name: 'Evening ride home', distance: 7900, calories: 294, moving_time: 1680, start_date: daysAgo(5, 18), is_commute: true, category: '日常交通', start_station: 'Old Street', end_station: 'Custom House', summary_polyline: '' },
  { id: 'demo-4', name: 'Weekend riverside', distance: 22100, calories: 815, moving_time: 4620, start_date: daysAgo(10, 10), is_commute: false, category: '休闲骑行', start_station: 'London Bridge', end_station: 'Greenwich', summary_polyline: '' },
  { id: 'demo-5', name: 'Morning commute', distance: 8200, calories: 321, moving_time: 1710, start_date: daysAgo(15, 8), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-6', name: 'Lunch errand', distance: 5100, calories: 195, moving_time: 1080, start_date: daysAgo(20, 13), is_commute: true, category: '日常交通', start_station: 'Bank', end_station: 'Shoreditch High Street', summary_polyline: '' },
]

export const demoMaintenanceTasks: MaintenanceTask[] = [
  { id: 'demo-chain', task_type: 'chain_clean', display_name: 'Clean and lubricate chain', distance_interval_km: 250, time_interval_days: 30, last_completed_at: daysAgo(33, 12), last_completed_odometer_km: 42, estimated_cost: null, notes: null, active: true },
]

export const demoRideAdvice = { temperature: 18, windSpeed: 12, windDirection: 225, raining: false, rainProbability: 10, sunset: daysAgo(0, 20), aqi: 18 }
