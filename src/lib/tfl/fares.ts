export type FareKey = 'z1_1' | 'z1_2' | 'z1_3' | 'z1_4' | 'z1_5' | 'z1_6' | 'outside_1' | 'outside_2' | 'outside_3' | 'outside_4' | 'z2_6'
export type SavingsMode = 'all_eligible' | 'commute_only'
export type TfLFareSettings = { fallbackFare: number; savingsMode: SavingsMode; peak: Record<FareKey, number>; offPeak: Record<FareKey, number> }
export type TfLFare = { amount: number; isPeak: boolean; source: 'tfl-2026' | 'fallback' }

export const DEFAULT_TFL_FARE_SETTINGS: TfLFareSettings = {
  fallbackFare: 3.1,
  savingsMode: 'all_eligible',
  peak: { z1_1: 3.1, z1_2: 3.6, z1_3: 3.9, z1_4: 4.8, z1_5: 5.3, z1_6: 5.9, outside_1: 2.3, outside_2: 2.5, outside_3: 3.2, outside_4: 3.4, z2_6: 3.8 },
  offPeak: { z1_1: 3.0, z1_2: 3.1, z1_3: 3.3, z1_4: 3.6, z1_5: 3.8, z1_6: 4.0, outside_1: 2.2, outside_2: 2.3, outside_3: 2.4, outside_4: 2.5, z2_6: 2.6 },
}

export function parseTfLFareSettings(value: unknown): TfLFareSettings {
  const saved = value && typeof value === 'object' ? value as Partial<TfLFareSettings> : {}
  const read = (source: Partial<Record<FareKey, number>> | undefined, fallback: Record<FareKey, number>) => Object.fromEntries(Object.entries(fallback).map(([key, amount]) => [key, typeof source?.[key as FareKey] === 'number' ? source[key as FareKey] : amount])) as Record<FareKey, number>
  return { fallbackFare: typeof saved.fallbackFare === 'number' ? saved.fallbackFare : DEFAULT_TFL_FARE_SETTINGS.fallbackFare, savingsMode: saved.savingsMode === 'commute_only' ? 'commute_only' : 'all_eligible', peak: read(saved.peak, DEFAULT_TFL_FARE_SETTINGS.peak), offPeak: read(saved.offPeak, DEFAULT_TFL_FARE_SETTINGS.offPeak) }
}

const CENTRAL_LONDON = { lat: 51.5074, lng: -0.1278 }
const zoneOverrides: Record<string, number> = { bank: 1, moorgate: 1, 'old street': 1, 'custom house': 3, 'royal victoria': 3, 'canary wharf': 2, 'dlr canary wharf': 2, 'liverpool street': 1, 'tower gateway': 1, farringdon: 1, paddington: 1, waterloo: 1, 'london bridge': 1, stratford: 2 }

function haversineKm(lat: number, lng: number) { const radians = (value: number) => value * Math.PI / 180; const dLat = radians(lat - CENTRAL_LONDON.lat); const dLng = radians(lng - CENTRAL_LONDON.lng); const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(CENTRAL_LONDON.lat)) * Math.cos(radians(lat)) * Math.sin(dLng / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(a)) }
export function getTfLZone(station: string, lat?: number, lng?: number) { const override = zoneOverrides[station.toLowerCase().trim()]; if (override) return override; if (lat == null || lng == null) return null; const distance = haversineKm(lat, lng); return distance <= 3 ? 1 : distance <= 6.5 ? 2 : distance <= 10 ? 3 : distance <= 14 ? 4 : distance <= 18 ? 5 : distance <= 23 ? 6 : null }
function isPeakJourney(startDate: string) { const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(startDate)).map(part => [part.type, part.value])); const minutes = Number(parts.hour) * 60 + Number(parts.minute); return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(parts.weekday) && ((minutes >= 390 && minutes < 570) || (minutes >= 960 && minutes < 1140)) }

export function getTfLSingleFare(start: { station?: string; lat?: number; lng?: number }, end: { station?: string; lat?: number; lng?: number }, startDate: string, settings = DEFAULT_TFL_FARE_SETTINGS): TfLFare | null {
  const startZone = getTfLZone(start.station ?? '', start.lat, start.lng); const endZone = getTfLZone(end.station ?? '', end.lat, end.lng); if (!startZone || !endZone || startZone > 6 || endZone > 6) return null
  const isPeak = isPeakJourney(startDate); const matrix = isPeak ? settings.peak : settings.offPeak; const maxZone = Math.max(startZone, endZone); let key: FareKey
  if (startZone === 1 || endZone === 1) key = `z1_${maxZone}` as FareKey
  else if (Math.min(startZone, endZone) === 2 && maxZone === 6) key = 'z2_6'
  else { const zonesTravelled = maxZone - Math.min(startZone, endZone) + 1; if (zonesTravelled > 4) return null; key = `outside_${zonesTravelled}` as FareKey }
  return { amount: matrix[key], isPeak, source: 'tfl-2026' }
}
