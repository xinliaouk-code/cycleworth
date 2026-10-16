import { classifyRide, type CommuteSettings } from '../rides/classify.ts'
import { getNearestStation, getStationCoordinates } from '../rides/stations.ts'
import type { HealthRide, ImportItem } from './types.ts'

export const MAX_WORKOUTS = 100
export const MAX_ROUTE_POINTS = 50_000
export const DEFAULT_COMMUTE_SETTINGS: CommuteSettings = {
  homeStation: 'Custom House, Royal Victoria', officeStation: 'Bank, Old Street',
  morningStart: 7, morningEnd: 10, eveningStart: 16, eveningEnd: 20,
}

export function commuteSettings(value: unknown): CommuteSettings {
  if (value == null) return DEFAULT_COMMUTE_SETTINGS
  if (!isObject(value)) throw new Error('Invalid commute settings')
  const result = { ...DEFAULT_COMMUTE_SETTINGS }
  for (const key of ['homeStation', 'officeStation'] as const) {
    if (typeof value[key] !== 'string' || value[key].length > 500) throw new Error('Invalid station settings')
    result[key] = value[key]
  }
  for (const key of ['morningStart', 'morningEnd', 'eveningStart', 'eveningEnd'] as const) {
    const hour = Number(value[key])
    if (value[key] === '' || value[key] == null || !Number.isInteger(hour) || hour < 0 || hour > 24) throw new Error('Invalid commute hours')
    result[key] = hour
  }
  if (result.morningStart >= result.morningEnd || result.eveningStart >= result.eveningEnd) throw new Error('Invalid commute window')
  return result
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Parse the documented numeric offset explicitly. Never use the host timezone.
export function healthDate(value: unknown): { iso: string; offset: string } {
  if (typeof value !== 'string') throw new Error('Missing timestamp with timezone')
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?\s?(Z|[+-]\d{2}:?\d{2})$/.exec(value)
  if (!match) throw new Error('Timestamp must include numeric timezone offset')
  const [, y, mo, d, h, mi, s, offset] = match
  const local = `${y}-${mo}-${d}T${h}:${mi}:${s}.000Z`
  const date = new Date(local)
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== local) throw new Error('Invalid calendar date')
  const normalized = offset === 'Z' ? '+0000' : offset.replace(':', '')
  const oh = Number(normalized.slice(1, 3)), om = Number(normalized.slice(3, 5))
  if (oh > 14 || om > 59 || (oh === 14 && om !== 0)) throw new Error('Invalid timezone offset')
  const isoInput = value.replace(' ', 'T').replace(/\s([+-])/, '$1')
  const instant = new Date(isoInput)
  if (!Number.isFinite(instant.getTime())) throw new Error('Invalid timestamp')
  return { iso: instant.toISOString(), offset: normalized }
}

export function encodePolyline(points: [number, number][]): string {
  let lat = 0, lng = 0, encoded = ''
  function component(delta: number) {
    let v = delta < 0 ? ~(delta << 1) : delta << 1
    let text = ''
    while (v >= 32) { text += String.fromCharCode((32 | (v & 31)) + 63); v >>>= 5 }
    return text + String.fromCharCode(v + 63)
  }
  for (const [latitude, longitude] of points) {
    const nextLat = Math.round(latitude * 1e5), nextLng = Math.round(longitude * 1e5)
    encoded += component(nextLat - lat) + component(nextLng - lng)
    lat = nextLat; lng = nextLng
  }
  return encoded
}

function station(point: [number, number] | undefined): string {
  if (!point) return '未知起点'
  const nearest = getNearestStation(...point)
  const coords = getStationCoordinates(nearest)
  if (!coords) return '未知起点'
  const distanceKm = Math.hypot((point[0] - coords.lat) * 111.32, (point[1] - coords.lng) * 69.5)
  return distanceKm <= 3 ? nearest : '未知起点'
}

export function workoutArray(payload: unknown): unknown[] {
  if (!isObject(payload)) throw new Error('Expected Workout V2 JSON object')
  if (payload.version != null && ![2, '2'].includes(payload.version as number)) throw new Error('Only Workout JSON Version 2 is supported')
  const body = isObject(payload.data) ? payload.data : payload
  if (!Array.isArray(body.workouts)) throw new Error('Expected data.workouts array')
  if (body.workouts.length > MAX_WORKOUTS) throw new Error(`Batch exceeds ${MAX_WORKOUTS} workouts; split the export`)
  return body.workouts
}

export function parseWorkouts(payload: unknown, settings = DEFAULT_COMMUTE_SETTINGS) {
  const rides: { index: number; ride: HealthRide }[] = []
  const items: ImportItem[] = []
  const seen = new Set<string>()
  workoutArray(payload).forEach((value, index) => {
    try {
      if (!isObject(value) || typeof value.name !== 'string' || !value.name.trim()) throw new Error('Missing workout name')
      if (!['cycling', 'outdoor cycling', 'indoor cycling'].includes(value.name.toLowerCase())) {
        items.push({ index, status: 'skipped', message: 'Non-cycling workout' }); return
      }
      if (typeof value.id !== 'string' || !/^[A-Za-z0-9._:-]{1,200}$/.test(value.id)) throw new Error('Missing or invalid stable Workout V2 id')
      const id = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value.id) ? value.id.toLowerCase() : value.id
      const start = healthDate(value.start), end = healthDate(value.end)
      const elapsed = (Date.parse(end.iso) - Date.parse(start.iso)) / 1000
      if (elapsed <= 0 || elapsed > 7 * 86400) throw new Error('Invalid workout interval')
      if (typeof value.duration !== 'number' || !Number.isFinite(value.duration) || value.duration <= 0 || value.duration > elapsed + 2) throw new Error('Invalid duration (seconds)')
      const warnings: string[] = []
      let distance = 0
      const missing = value.distance == null || (isObject(value.distance) && value.distance.qty == null)
      if (missing) warnings.push('Distance missing: stored as 0 metres; no automatic saving')
      else {
        const q = value.distance
        if (!isObject(q) || typeof q.qty !== 'number' || !Number.isFinite(q.qty) || q.qty < 0) throw new Error('Invalid distance')
        const factor = q.units === 'km' ? 1000 : q.units === 'mi' ? 1609.344 : q.units === 'm' ? 1 : null
        if (factor === null) throw new Error('Unsupported distance unit; expected km, mi or m')
        distance = q.qty * factor
        if (distance > 5_000_000) throw new Error('Distance exceeds 5000 km')
      }
      if (value.isIndoor != null && typeof value.isIndoor !== 'boolean') throw new Error('Invalid isIndoor flag')
      const indoor = value.isIndoor === true || value.location === 'Indoor' || value.name.toLowerCase() === 'indoor cycling'
      let points: [number, number][] = []
      if (value.route != null) {
        if (!Array.isArray(value.route)) warnings.push('Invalid route: imported without GPS')
        else {
          if (value.route.length > MAX_ROUTE_POINTS) throw new Error('Route exceeds 50000 points; use a smaller export')
          const valid = value.route.filter(p => isObject(p) && typeof p.latitude === 'number' && Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && typeof p.longitude === 'number' && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180)
          if (valid.length !== value.route.length) warnings.push('Invalid GPS points omitted')
          points = valid.map(p => [p.latitude as number, p.longitude as number])
        }
      }
      if (indoor) points = []
      if (points.length < 2) { points = []; warnings.push('No usable GPS route; manual classification available') }
      const startStation = station(points[0]), endStation = station(points.at(-1))
      const classification = !indoor && distance > 0 && startStation !== '未知起点' && endStation !== '未知起点'
        ? classifyRide(start.iso, startStation, endStation, settings)
        : { category: '休闲骑行', isSavingsEligible: false }
      // Preserve all accepted GPS points; the payload and point caps bound storage.
      const sampled = points
      const quantity = (raw: unknown, units: Record<string, number>, label: string) => {
        if (raw == null) return null
        if (!isObject(raw) || typeof raw.qty !== 'number' || !Number.isFinite(raw.qty) || raw.qty < 0 || typeof raw.units !== 'string' || units[raw.units] == null) {
          warnings.push(`${label} unavailable: invalid value or unit`); return null
        }
        return raw.qty * units[raw.units]
      }
      const averageSpeed = quantity(value.avgSpeed ?? value.speed, { kmph: 1/3.6, 'km/h': 1/3.6, mph: 0.44704, 'm/s': 1 }, 'Average speed')
      const maxSpeed = quantity(value.maxSpeed, { kmph: 1/3.6, 'km/h': 1/3.6, mph: 0.44704, 'm/s': 1 }, 'Maximum speed')
      const elevation = quantity(value.elevationUp, { m: 1, ft: 0.3048 }, 'Elevation')
      const calories = quantity(value.activeEnergyBurned, { kcal: 1, kJ: 1/4.184 }, 'Energy')
      const altitudes = Array.isArray(value.route) ? value.route.filter(p => isObject(p) && typeof p.altitude === 'number' && Number.isFinite(p.altitude)).map(p => (p as Record<string, number>).altitude) : []
      const elevationProfile = altitudes.length > 1 ? altitudes.filter((_,i)=>i%Math.max(1,Math.ceil(altitudes.length/500))===0 || i===altitudes.length-1) : null
      const ride: HealthRide = {
        source: 'apple_health', external_activity_id: id, name: indoor ? 'Indoor Cycling' : 'Cycling',
        start_date: start.iso, end_date: end.iso, source_timezone_offset: start.offset,
        average_speed: averageSpeed ?? (distance > 0 ? distance / value.duration : null), max_speed: maxSpeed, total_elevation_gain: elevation, calories, elevation_profile: indoor ? null : elevationProfile,
        distance, moving_time: Math.round(value.duration), elapsed_time: Math.round(elapsed),
        type: indoor ? 'VirtualRide' : 'Ride', summary_polyline: points.length ? encodePolyline(sampled) : null,
        start_station: startStation, end_station: endStation,
        is_commute: classification.isSavingsEligible, category: classification.category,
        is_manual_override: false,
        source_metadata: { format: 'health-auto-export-v2', distance_missing: missing, indoor },
      }
      if (seen.has(id)) { items.push({ index, external_activity_id: id, status: 'exists', message: 'Repeated ID within this batch' }); return }
      seen.add(id)
      rides.push({ index, ride })
      items.push({ index, external_activity_id: id, status: 'new', warnings })
    } catch (error) {
      items.push({ index, status: 'failed', message: error instanceof Error ? error.message : 'Invalid workout' })
    }
  })
  return { rides, items }
}
