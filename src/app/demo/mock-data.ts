import type { MaintenanceTask } from '../../lib/maintenance'
import type { Ride } from '../dashboard/_lib/utils'

type Point = [number, number]

// Static London route templates, encoded using the same Google polyline format
// consumed by the production RideMap component. The points are intentionally
// approximate and never fetched from an external routing service.
function encodePolyline(points: Point[]) {
  let previousLat = 0
  let previousLng = 0
  return points.map(([lat, lng]) => {
    const encode = (value: number) => {
      let current = value < 0 ? ~(value << 1) : value << 1
      let output = ''
      while (current >= 0x20) { output += String.fromCharCode((0x20 | (current & 0x1f)) + 63); current >>= 5 }
      return output + String.fromCharCode(current + 63)
    }
    const nextLat = Math.round(lat * 1e5)
    const nextLng = Math.round(lng * 1e5)
    const encoded = encode(nextLat - previousLat) + encode(nextLng - previousLng)
    previousLat = nextLat
    previousLng = nextLng
    return encoded
  }).join('')
}

const routeTemplates = {
  a: encodePolyline([[51.5054, -0.0202], [51.5105, -0.029], [51.5131, -0.0396], [51.507, -0.0559], [51.5098, -0.0766], [51.5134, -0.089]]),
  b: encodePolyline([[51.5134, -0.089], [51.5113, -0.076], [51.509, -0.058], [51.505, -0.041], [51.5054, -0.0202]]),
  c: encodePolyline([[51.5054, -0.0202], [51.5005, -0.031], [51.5035, -0.048], [51.505, -0.056], [51.507, -0.069], [51.5134, -0.089]]),
  d: encodePolyline([[51.5134, -0.089], [51.5146, -0.0973], [51.5115, -0.1031], [51.507, -0.082], [51.5045, -0.0559], [51.5054, -0.0202]]),
  e: encodePolyline([[51.5054, -0.0202], [51.503, -0.043], [51.5055, -0.0865], [51.5055, -0.0865], [51.5012, -0.0934], [51.508, -0.075], [51.5054, -0.0202]]),
  f: encodePolyline([[51.5134, -0.089], [51.5098, -0.0766], [51.5055, -0.075], [51.5025, -0.06], [51.5054, -0.0202]]),
  g: encodePolyline([[51.5054, -0.0202], [51.5106, -0.041], [51.5154, -0.0726], [51.5178, -0.0823]]),
  urbanCity: encodePolyline([[51.5054, -0.0202], [51.5045, -0.0559], [51.5098, -0.0766], [51.5134, -0.089], [51.5146, -0.0973], [51.5055, -0.0865], [51.5054, -0.0202]]),
  urbanBorough: encodePolyline([[51.5054, -0.0202], [51.503, -0.045], [51.5055, -0.0865], [51.5012, -0.0934], [51.497, -0.09], [51.5025, -0.06], [51.5054, -0.0202]]),
  urbanEast: encodePolyline([[51.5054, -0.0202], [51.510, -0.035], [51.516, -0.055], [51.5235, -0.078], [51.5178, -0.0823], [51.5098, -0.0766], [51.5054, -0.0202]]),
  leisureGreenwich: encodePolyline([[51.5054, -0.0202], [51.4957, -0.014], [51.4871, -0.012], [51.482, -0.0108], [51.4779, -0.0132], [51.49, -0.02], [51.5054, -0.0202]]),
  leisureCanal: encodePolyline([[51.5054, -0.0202], [51.525, -0.025], [51.543, -0.025], [51.548, -0.055], [51.535, -0.075], [51.525, -0.07], [51.5054, -0.0202]]),
  leisureCentral: encodePolyline([[51.5054, -0.0202], [51.5055, -0.0865], [51.5115, -0.1031], [51.515, -0.12], [51.505, -0.14], [51.495, -0.12], [51.5012, -0.0934], [51.5054, -0.0202]]),
}

const routeForRide: Record<string, keyof typeof routeTemplates> = {
  'demo-ride-036': 'a', 'demo-ride-035': 'f', 'demo-ride-034': 'g', 'demo-ride-033': 'leisureGreenwich', 'demo-ride-032': 'urbanCity', 'demo-ride-031': 'b', 'demo-ride-030': 'c', 'demo-ride-029': 'leisureCanal', 'demo-ride-028': 'e', 'demo-ride-027': 'a', 'demo-ride-026': 'urbanEast', 'demo-ride-025': 'b', 'demo-ride-024': 'urbanCity', 'demo-ride-023': 'f', 'demo-ride-022': 'c', 'demo-ride-021': 'leisureGreenwich', 'demo-ride-020': 'urbanBorough', 'demo-ride-019': 'f', 'demo-ride-018': 'a', 'demo-ride-017': 'd', 'demo-ride-016': 'c', 'demo-ride-015': 'urbanCity', 'demo-ride-014': 'b', 'demo-ride-013': 'g', 'demo-ride-012': 'leisureCanal', 'demo-ride-011': 'f', 'demo-ride-010': 'a', 'demo-ride-009': 'urbanCity', 'demo-ride-008': 'b', 'demo-ride-007': 'c', 'demo-ride-006': 'd', 'demo-ride-005': 'a', 'demo-ride-004': 'urbanEast', 'demo-ride-003': 'leisureCentral', 'demo-ride-002': 'b', 'demo-ride-001': 'a',
}

export const demoSettings = {
  bicycle: 'Brompton C Line 12-speed',
  bikePrice: '1650',
  avoidedTransportCost: 3.6,
  homeStation: 'Canary Wharf',
  officeStation: 'Bank, Liverpool Street',
  morningStart: '7', morningEnd: '10', eveningStart: '16', eveningEnd: '20',
} as const

// Fixed, hand-authored activity history for the standalone demo. Dates, route
// names and metrics deliberately model one Canary Wharf / City cyclist.
const demoRideRows: Ride[] = [
  { id: 'demo-ride-036', name: 'Canary Wharf to Bank, via Limehouse', distance: 6300, moving_time: 1540, calories: 238, start_date: '2026-08-06T07:48:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-ride-035', name: 'Bank to Canary Wharf, Tower Bridge return', distance: 8100, moving_time: 2080, calories: 306, start_date: '2026-08-05T17:42:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-034', name: 'Canary Wharf to Liverpool Street', distance: 7200, moving_time: 1780, calories: 271, start_date: '2026-08-04T08:06:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Liverpool Street', summary_polyline: '' },
  { id: 'demo-ride-033', name: 'Sunday Thames Path spin', distance: 21400, moving_time: 5100, calories: 786, start_date: '2026-08-02T10:18:00.000Z', is_commute: false, category: '休闲骑行', start_station: 'Canary Wharf', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-032', name: 'City errands via St Paul’s', distance: 14200, moving_time: 3550, calories: 530, start_date: '2026-07-30T18:24:00.000Z', is_commute: false, category: '日常交通', start_station: 'Canary Wharf', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-031', name: 'Bank to Canary Wharf after a rain shower', distance: 6800, moving_time: 1830, calories: 259, start_date: '2026-07-28T17:55:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-030', name: 'Canary Wharf to Bank, dock detour', distance: 7700, moving_time: 1910, calories: 291, start_date: '2026-07-27T07:39:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-ride-029', name: 'Saturday Regent’s Canal loop', distance: 24800, moving_time: 5880, calories: 914, start_date: '2026-07-25T10:04:00.000Z', is_commute: false, category: '休闲骑行', start_station: 'Canary Wharf', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-028', name: 'Bank to Canary Wharf via London Bridge', distance: 9400, moving_time: 2340, calories: 357, start_date: '2026-07-22T18:13:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-027', name: 'Canary Wharf to Bank, morning commute', distance: 6500, moving_time: 1600, calories: 247, start_date: '2026-07-21T07:52:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-ride-026', name: 'Evening City and Tower Bridge loop', distance: 12800, moving_time: 3220, calories: 483, start_date: '2026-07-16T19:02:00.000Z', is_commute: false, category: '日常交通', start_station: 'Liverpool Street', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-025', name: 'Bank to Canary Wharf, quick return', distance: 6900, moving_time: 1650, calories: 260, start_date: '2026-07-15T17:38:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-024', name: 'Canary Wharf to St Paul’s before work', distance: 10400, moving_time: 2580, calories: 392, start_date: '2026-07-14T07:21:00.000Z', is_commute: false, category: '日常交通', start_station: 'Canary Wharf', end_station: "St. Paul's", summary_polyline: '' },
  { id: 'demo-ride-023', name: 'Bank to Canary Wharf, river route', distance: 7800, moving_time: 1940, calories: 297, start_date: '2026-07-09T17:46:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-022', name: 'Canary Wharf to Bank via Shadwell', distance: 6200, moving_time: 1570, calories: 236, start_date: '2026-07-08T07:58:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-ride-021', name: 'Weekend Greenwich and Woolwich loop', distance: 19600, moving_time: 4760, calories: 724, start_date: '2026-07-05T10:42:00.000Z', is_commute: false, category: '休闲骑行', start_station: 'Canary Wharf', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-020', name: 'Canary Wharf to Borough and back', distance: 16400, moving_time: 4030, calories: 612, start_date: '2026-07-02T18:31:00.000Z', is_commute: false, category: '日常交通', start_station: 'Canary Wharf', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-019', name: 'Bank to Canary Wharf via Tower Hill', distance: 8600, moving_time: 2160, calories: 330, start_date: '2026-06-25T17:51:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-018', name: 'Canary Wharf to Bank, early start', distance: 7100, moving_time: 1690, calories: 269, start_date: '2026-06-24T07:32:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-ride-017', name: 'St Paul’s to Canary Wharf after meetings', distance: 8900, moving_time: 2280, calories: 342, start_date: '2026-06-18T18:07:00.000Z', is_commute: true, category: '通勤骑行', start_station: "St. Paul's", end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-016', name: 'Canary Wharf to Bank, City detour', distance: 7400, moving_time: 1860, calories: 284, start_date: '2026-06-17T07:44:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-ride-015', name: 'Canary Wharf to City after-work loop', distance: 11600, moving_time: 2910, calories: 441, start_date: '2026-06-11T18:45:00.000Z', is_commute: false, category: '日常交通', start_station: 'Canary Wharf', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-014', name: 'Bank to Canary Wharf via Wapping', distance: 6700, moving_time: 1740, calories: 254, start_date: '2026-06-04T17:59:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-013', name: 'Canary Wharf to Liverpool Street, coffee stop', distance: 8300, moving_time: 2180, calories: 318, start_date: '2026-06-03T07:36:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Liverpool Street', summary_polyline: '' },
  { id: 'demo-ride-012', name: 'Sunday Lea Valley ride', distance: 26200, moving_time: 6260, calories: 968, start_date: '2026-05-31T10:26:00.000Z', is_commute: false, category: '休闲骑行', start_station: 'Canary Wharf', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-011', name: 'City to Canary Wharf through Tower Bridge', distance: 9800, moving_time: 2460, calories: 374, start_date: '2026-05-21T18:18:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-010', name: 'Canary Wharf to Bank, dockside route', distance: 6600, moving_time: 1590, calories: 250, start_date: '2026-05-20T07:49:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-ride-009', name: 'Canary Wharf, City and St Paul’s circuit', distance: 18700, moving_time: 4620, calories: 705, start_date: '2026-05-14T18:36:00.000Z', is_commute: false, category: '日常交通', start_station: 'Canary Wharf', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-008', name: 'Bank to Canary Wharf, evening commute', distance: 7000, moving_time: 1770, calories: 265, start_date: '2026-05-07T17:41:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-007', name: 'Canary Wharf to Bank, via Limehouse Basin', distance: 6400, moving_time: 1660, calories: 244, start_date: '2026-05-06T07:57:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-ride-006', name: 'Bank to Canary Wharf, extra City stop', distance: 8300, moving_time: 2110, calories: 316, start_date: '2026-04-23T18:02:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-005', name: 'Canary Wharf to Bank, morning commute', distance: 7600, moving_time: 1810, calories: 288, start_date: '2026-04-22T07:43:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Bank', summary_polyline: '' },
  { id: 'demo-ride-004', name: 'Canary Wharf to City evening ride', distance: 13900, moving_time: 3460, calories: 522, start_date: '2026-04-16T18:52:00.000Z', is_commute: false, category: '日常交通', start_station: 'Canary Wharf', end_station: 'Liverpool Street', summary_polyline: '' },
  { id: 'demo-ride-003', name: 'Saturday Richmond Park and river loop', distance: 22700, moving_time: 5650, calories: 838, start_date: '2026-04-11T10:13:00.000Z', is_commute: false, category: '休闲骑行', start_station: 'Canary Wharf', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-002', name: 'Bank to Canary Wharf, after-work return', distance: 7200, moving_time: 1850, calories: 274, start_date: '2026-03-26T17:49:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Bank', end_station: 'Canary Wharf', summary_polyline: '' },
  { id: 'demo-ride-001', name: 'Canary Wharf to Bank, first spring commute', distance: 6900, moving_time: 1750, calories: 262, start_date: '2026-03-24T07:54:00.000Z', is_commute: true, category: '通勤骑行', start_station: 'Canary Wharf', end_station: 'Bank', summary_polyline: '' },
]

export const demoRides: Ride[] = demoRideRows.map(ride => ({ ...ride, summary_polyline: routeTemplates[routeForRide[ride.id]] }))

export const demoMaintenanceHistory = [
  { id: 'demo-maintenance-4', task_type: 'tyre_pressure', completed_at: '2026-08-02T09:20:00.000Z', odometer_km: 365.4, cost: null, notes: 'Checked both tyres before the Thames Path ride.' },
  { id: 'demo-maintenance-3', task_type: 'chain_clean', completed_at: '2026-07-08T19:10:00.000Z', odometer_km: 276.2, cost: 11.5, notes: 'Degreased and lubricated drivetrain after wet commutes.' },
  { id: 'demo-maintenance-2', task_type: 'brake_pads', completed_at: '2026-05-22T18:30:00.000Z', odometer_km: 150.6, cost: null, notes: 'Brake inspection; pads still have good wear remaining.' },
  { id: 'demo-maintenance-1', task_type: 'chain_wear', completed_at: '2026-04-12T11:15:00.000Z', odometer_km: 59.8, cost: null, notes: 'Drivetrain inspection and chain wear check.' },
]

export const demoMaintenanceTasks: MaintenanceTask[] = [
  { id: 'demo-chain', task_type: 'chain_clean', display_name: 'Clean and lubricate chain', distance_interval_km: 250, time_interval_days: 30, last_completed_at: '2026-07-08T19:10:00.000Z', last_completed_odometer_km: 276.2, estimated_cost: 11.5, notes: 'Due soon after a month of City commuting.', active: true },
  { id: 'demo-tyres', task_type: 'tyre_pressure', display_name: 'Check tyre pressure', distance_interval_km: null, time_interval_days: 7, last_completed_at: '2026-08-02T09:20:00.000Z', last_completed_odometer_km: 365.4, estimated_cost: null, notes: null, active: true },
  { id: 'demo-brakes', task_type: 'brake_pads', display_name: 'Inspect brake pads', distance_interval_km: 750, time_interval_days: 90, last_completed_at: '2026-05-22T18:30:00.000Z', last_completed_odometer_km: 150.6, estimated_cost: null, notes: 'Checked after spring riding.', active: true },
]

export const demoRideAdvice = { temperature: 18, windSpeed: 12, windDirection: 225, raining: false, rainProbability: 10, sunset: '2026-08-06T19:33:00.000Z', aqi: 18 }
