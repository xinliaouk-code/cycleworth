export type TfLFare = { amount: number; isPeak: boolean; source: 'tfl-2026' | 'fallback' }

const CENTRAL_LONDON = { lat: 51.5074, lng: -0.1278 }
const zoneOverrides: Record<string, number> = {
  'bank': 1, 'moorgate': 1, 'old street': 1, 'custom house': 3,
  'royal victoria': 3, 'canary wharf': 2, 'dlr canary wharf': 2,
  'liverpool street': 1, 'tower gateway': 1, 'farringdon': 1,
  'paddington': 1, 'waterloo': 1, 'london bridge': 1, 'stratford': 2,
}

function haversineKm(lat: number, lng: number) {
  const toRadians = (value: number) => value * Math.PI / 180
  const earthRadiusKm = 6371
  const dLat = toRadians(lat - CENTRAL_LONDON.lat)
  const dLng = toRadians(lng - CENTRAL_LONDON.lng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(CENTRAL_LONDON.lat)) * Math.cos(toRadians(lat)) * Math.sin(dLng / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a))
}

export function getTfLZone(station: string, lat?: number, lng?: number) {
  const override = zoneOverrides[station.toLowerCase().trim()]
  if (override) return override
  if (lat == null || lng == null) return null
  const distance = haversineKm(lat, lng)
  if (distance <= 3) return 1
  if (distance <= 6.5) return 2
  if (distance <= 10) return 3
  if (distance <= 14) return 4
  if (distance <= 18) return 5
  if (distance <= 23) return 6
  return null
}

function isPeakJourney(startDate: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(startDate)).map(part => [part.type, part.value]))
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(parts.weekday)
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  return weekday && ((minutes >= 390 && minutes < 570) || (minutes >= 960 && minutes < 1140))
}

export function getTfLSingleFare(start: { station?: string; lat?: number; lng?: number }, end: { station?: string; lat?: number; lng?: number }, startDate: string): TfLFare | null {
  const startZone = getTfLZone(start.station ?? '', start.lat, start.lng)
  const endZone = getTfLZone(end.station ?? '', end.lat, end.lng)
  if (!startZone || !endZone || startZone > 6 || endZone > 6) return null
  const peak = isPeakJourney(startDate)
  const fare = (amount: number): TfLFare => ({ amount, isPeak: peak, source: 'tfl-2026' })
  if (startZone === 1 || endZone === 1) {
    const maxZone = Math.max(startZone, endZone)
    const peakFares = [0, 3.1, 3.6, 3.9, 4.8, 5.3, 5.9]
    const offPeakFares = [0, 3.0, 3.1, 3.3, 3.6, 3.8, 4.0]
    return fare((peak ? peakFares : offPeakFares)[maxZone])
  }
  const low = Math.min(startZone, endZone)
  const high = Math.max(startZone, endZone)
  if (low === 2 && high === 6) return fare(peak ? 3.8 : 2.6)
  const zonesTravelled = high - low + 1
  const matrix = peak ? [0, 2.3, 2.5, 3.2, 3.4] : [0, 2.2, 2.3, 2.4, 2.5]
  return zonesTravelled <= 4 ? fare(matrix[zonesTravelled]) : null
}
