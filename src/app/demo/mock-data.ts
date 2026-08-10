import type { MaintenanceTask } from '../../lib/maintenance'
import type { Ride } from '../dashboard/_lib/utils'

function encodePolyline(points: [number, number][]): string {
  let str = ''
  let prevLat = 0
  let prevLng = 0

  for (const [lat, lng] of points) {
    const late5 = Math.round(lat * 1e5)
    const lnge5 = Math.round(lng * 1e5)

    let dLat = late5 - prevLat
    let dLng = lnge5 - prevLng

    prevLat = late5
    prevLng = lnge5

    for (let val of [dLat, dLng]) {
      val = val < 0 ? ~(val << 1) : val << 1
      while (val >= 0x20) {
        str += String.fromCharCode((0x20 | (val & 0x1f)) + 63)
        val >>= 5
      }
      str += String.fromCharCode(val + 63)
    }
  }
  return str
}

const polylineEastToCity = encodePolyline([
  [51.5093, 0.0263], [51.5091, 0.0175], [51.5147, 0.0083], [51.5121, -0.0384],
  [51.5105, -0.0631], [51.5113, -0.0762], [51.5134, -0.0889]
])

const polylineCityToEast = encodePolyline([
  [51.5257, -0.0875], [51.5218, -0.0760], [51.5142, -0.0745], [51.5115, -0.0360],
  [51.5098, -0.0012], [51.5093, 0.0263]
])

const polylineVictoriaCanal = encodePolyline([
  [51.5362, -0.0412], [51.5398, -0.0285], [51.5435, -0.0210], [51.5501, -0.0152],
  [51.5463, -0.0080], [51.5340, -0.0350]
])

const polylineThamesGreenwich = encodePolyline([
  [51.5079, -0.0877], [51.5032, -0.0680], [51.4981, -0.0482], [51.4882, -0.0315],
  [51.4828, -0.0096], [51.4768, -0.0005]
])

const polylineHydeParkRegents = encodePolyline([
  [51.5033, -0.1517], [51.5132, -0.1588], [51.5285, -0.1530], [51.5415, -0.1455],
  [51.5352, -0.1245], [51.5322, -0.1058]
])

const polylineRichmondPark = encodePolyline([
  [51.4485, -0.2982], [51.4462, -0.2780], [51.4502, -0.2520], [51.4325, -0.2540],
  [51.4210, -0.2850], [51.4430, -0.2990]
])

const polylineBatterseaChelsea = encodePolyline([
  [51.4791, -0.1568], [51.4815, -0.1668], [51.4872, -0.1695], [51.4941, -0.1738],
  [51.5008, -0.1925]
])

const daysAgo = (days: number, hour = 8, minute = 30) => {
  const value = new Date()
  value.setDate(value.getDate() - days)
  value.setHours(hour, minute, 0, 0)
  return value.toISOString()
}

// Generate 40 realistic rides in London across the last ~85 days
export const demoRides: Ride[] = [
  // Week 1
  { id: 'demo-01', name: 'Morning commute to Bank', distance: 8250, calories: 320, moving_time: 1740, start_date: daysAgo(1, 8, 20), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-02', name: 'Evening commute to Custom House', distance: 8100, calories: 310, moving_time: 1690, start_date: daysAgo(1, 17, 45), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-03', name: 'Morning commute to Old Street', distance: 8400, calories: 330, moving_time: 1800, start_date: daysAgo(2, 8, 15), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Old Street', summary_polyline: polylineEastToCity },
  { id: 'demo-04', name: 'Evening ride via City', distance: 8350, calories: 325, moving_time: 1770, start_date: daysAgo(2, 18, 10), is_commute: true, category: '通勤骑行', start_station: 'Old Street', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-05', name: 'Victoria Park Canal Loop', distance: 15200, calories: 580, moving_time: 3240, start_date: daysAgo(3, 11, 0), is_commute: false, category: '休闲骑行', start_station: 'Victoria Park', end_station: 'Hackney Wick', summary_polyline: polylineVictoriaCanal },
  { id: 'demo-06', name: 'Grocery run to Shoreditch', distance: 5400, calories: 210, moving_time: 1140, start_date: daysAgo(4, 13, 30), is_commute: true, category: '日常交通', start_station: 'Bank', end_station: 'Shoreditch High Street', summary_polyline: polylineEastToCity },

  // Week 2
  { id: 'demo-07', name: 'Morning commute to Bank', distance: 8200, calories: 318, moving_time: 1720, start_date: daysAgo(7, 8, 25), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-08', name: 'Evening return to East London', distance: 8150, calories: 312, moving_time: 1700, start_date: daysAgo(7, 18, 0), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-09', name: 'Morning commute to Old Street', distance: 8450, calories: 335, moving_time: 1820, start_date: daysAgo(8, 8, 10), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Old Street', summary_polyline: polylineEastToCity },
  { id: 'demo-10', name: 'Thames Path to Greenwich', distance: 18500, calories: 710, moving_time: 4100, start_date: daysAgo(9, 14, 0), is_commute: false, category: '休闲骑行', start_station: 'London Bridge', end_station: 'Greenwich Observatory', summary_polyline: polylineThamesGreenwich },
  { id: 'demo-11', name: 'Battersea Park spin', distance: 12100, calories: 450, moving_time: 2700, start_date: daysAgo(10, 10, 30), is_commute: false, category: '休闲骑行', start_station: 'Battersea Park', end_station: 'Chelsea', summary_polyline: polylineBatterseaChelsea },

  // Week 3 & 4
  { id: 'demo-12', name: 'Morning commute to Bank', distance: 8200, calories: 320, moving_time: 1710, start_date: daysAgo(14, 8, 30), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-13', name: 'Evening commute home', distance: 8100, calories: 310, moving_time: 1680, start_date: daysAgo(14, 18, 15), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-14', name: 'Morning commute to City', distance: 8250, calories: 322, moving_time: 1730, start_date: daysAgo(15, 8, 20), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-15', name: 'Evening commute home', distance: 8050, calories: 308, moving_time: 1670, start_date: daysAgo(15, 17, 50), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-16', name: 'Hyde Park & Regents loop', distance: 21400, calories: 840, moving_time: 4800, start_date: daysAgo(17, 11, 0), is_commute: false, category: '休闲骑行', start_station: 'Hyde Park Corner', end_station: 'Angel Islington', summary_polyline: polylineHydeParkRegents },
  { id: 'demo-17', name: 'Lunch trip to Canary Wharf', distance: 6100, calories: 235, moving_time: 1320, start_date: daysAgo(18, 12, 45), is_commute: true, category: '日常交通', start_station: 'Custom House', end_station: 'Canary Wharf', summary_polyline: polylineEastToCity },

  // Month 2
  { id: 'demo-18', name: 'Morning commute to Bank', distance: 8300, calories: 325, moving_time: 1750, start_date: daysAgo(21, 8, 15), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-19', name: 'Evening commute home', distance: 8150, calories: 315, moving_time: 1700, start_date: daysAgo(21, 18, 5), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-20', name: 'Richmond Park Weekend Lap', distance: 32500, calories: 1250, moving_time: 6800, start_date: daysAgo(23, 9, 30), is_commute: false, category: '休闲骑行', start_station: 'Richmond Gate', end_station: 'Richmond Gate', summary_polyline: polylineRichmondPark },
  { id: 'demo-21', name: 'Morning commute to Bank', distance: 8200, calories: 318, moving_time: 1720, start_date: daysAgo(25, 8, 20), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-22', name: 'Evening commute home', distance: 8100, calories: 310, moving_time: 1690, start_date: daysAgo(25, 17, 45), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-23', name: 'Morning commute to Old Street', distance: 8400, calories: 330, moving_time: 1790, start_date: daysAgo(27, 8, 10), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Old Street', summary_polyline: polylineEastToCity },
  { id: 'demo-24', name: 'Evening ride home', distance: 8250, calories: 320, moving_time: 1740, start_date: daysAgo(27, 18, 20), is_commute: true, category: '通勤骑行', start_station: 'Old Street', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-25', name: 'Weekend Docklands circuit', distance: 16800, calories: 640, moving_time: 3600, start_date: daysAgo(30, 10, 15), is_commute: false, category: '休闲骑行', start_station: 'Custom House', end_station: 'Greenwich Peninsula', summary_polyline: polylineEastToCity },

  // Month 3
  { id: 'demo-26', name: 'Morning commute to Bank', distance: 8200, calories: 320, moving_time: 1730, start_date: daysAgo(35, 8, 25), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-27', name: 'Evening commute home', distance: 8100, calories: 312, moving_time: 1690, start_date: daysAgo(35, 18, 0), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-28', name: 'Morning commute to Bank', distance: 8250, calories: 322, moving_time: 1740, start_date: daysAgo(38, 8, 15), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-29', name: 'Evening return ride', distance: 8150, calories: 315, moving_time: 1710, start_date: daysAgo(38, 17, 50), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-30', name: 'Canal towing path to Angel', distance: 14200, calories: 540, moving_time: 3100, start_date: daysAgo(42, 14, 30), is_commute: false, category: '日常交通', start_station: 'Limehouse Basin', end_station: 'Angel Islington', summary_polyline: polylineVictoriaCanal },
  { id: 'demo-31', name: 'Morning commute to Old Street', distance: 8400, calories: 330, moving_time: 1800, start_date: daysAgo(45, 8, 20), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Old Street', summary_polyline: polylineEastToCity },
  { id: 'demo-32', name: 'Evening commute home', distance: 8300, calories: 325, moving_time: 1760, start_date: daysAgo(45, 18, 10), is_commute: true, category: '通勤骑行', start_station: 'Old Street', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-33', name: 'Thames South Bank spin', distance: 17500, calories: 670, moving_time: 3800, start_date: daysAgo(50, 11, 20), is_commute: false, category: '休闲骑行', start_station: 'London Bridge', end_station: 'Greenwich', summary_polyline: polylineThamesGreenwich },
  { id: 'demo-34', name: 'Morning commute to Bank', distance: 8200, calories: 318, moving_time: 1710, start_date: daysAgo(55, 8, 30), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-35', name: 'Evening commute home', distance: 8100, calories: 310, moving_time: 1680, start_date: daysAgo(55, 17, 40), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-36', name: 'Morning commute to Bank', distance: 8250, calories: 320, moving_time: 1730, start_date: daysAgo(60, 8, 20), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-37', name: 'Evening return ride', distance: 8100, calories: 312, moving_time: 1690, start_date: daysAgo(60, 18, 0), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
  { id: 'demo-38', name: 'Olympic Park weekend ride', distance: 19800, calories: 780, moving_time: 4300, start_date: daysAgo(68, 10, 0), is_commute: false, category: '休闲骑行', start_station: 'Victoria Park', end_station: 'Stratford Velopark', summary_polyline: polylineVictoriaCanal },
  { id: 'demo-39', name: 'Morning commute to Bank', distance: 8200, calories: 318, moving_time: 1720, start_date: daysAgo(75, 8, 15), is_commute: true, category: '通勤骑行', start_station: 'Custom House', end_station: 'Bank', summary_polyline: polylineEastToCity },
  { id: 'demo-40', name: 'Evening commute home', distance: 8100, calories: 310, moving_time: 1680, start_date: daysAgo(75, 17, 45), is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Custom House', summary_polyline: polylineCityToEast },
]

export const demoMaintenanceTasks: MaintenanceTask[] = [
  { id: 'demo-chain-clean', task_type: 'chain_clean', display_name: '链条清洁与润滑 (Clean & lube chain)', distance_interval_km: 250, time_interval_days: 30, last_completed_at: daysAgo(18, 12), last_completed_odometer_km: 240, estimated_cost: 12, notes: '链条油润滑完成', active: true },
  { id: 'demo-brake-pads', task_type: 'brake_check', display_name: '煞车片与拉线检查 (Brake pads & cable check)', distance_interval_km: 500, time_interval_days: 90, last_completed_at: daysAgo(42, 10), last_completed_odometer_km: 120, estimated_cost: 25, notes: '更换前煞车片', active: true },
  { id: 'demo-tire-pressure', task_type: 'tire_pressure', display_name: '胎压检查与补气 (Tire pressure check)', distance_interval_km: null, time_interval_days: 14, last_completed_at: daysAgo(11, 9), last_completed_odometer_km: 380, estimated_cost: 0, notes: '打气至 85 PSI', active: true },
  { id: 'demo-full-tuneup', task_type: 'full_tuneup', display_name: '全车综合保养与调校 (Full bike tune-up)', distance_interval_km: 1000, time_interval_days: 180, last_completed_at: daysAgo(60, 15), last_completed_odometer_km: 50, estimated_cost: 85, notes: '全车螺栓扭力复查及变档微调', active: true },
  { id: 'demo-chain-replace', task_type: 'chain_replace', display_name: '链条与飞轮磨损更换 (Replace chain & cassette)', distance_interval_km: 2000, time_interval_days: 365, last_completed_at: daysAgo(80, 10), last_completed_odometer_km: 0, estimated_cost: 45, notes: '新车出厂', active: true },
]

export const demoRideAdvice = {
  temperature: 18,
  windSpeed: 12,
  windDirection: 225,
  raining: false,
  rainProbability: 10,
  sunset: daysAgo(0, 20, 15),
  aqi: 18
}

export const demoUser = {
  id: 'demo-user-aistudio',
  email: 'demo.cyclist@example.com'
}
