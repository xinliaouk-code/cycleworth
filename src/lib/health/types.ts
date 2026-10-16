// Health Auto Export Workout JSON V2. All input remains unknown until validated.
export type HealthRide = {
  source: 'apple_health'
  external_activity_id: string
  name: string
  start_date: string
  end_date: string
  source_timezone_offset: string
  distance: number
  moving_time: number
  elapsed_time: number
  average_speed: number | null
  max_speed: number | null
  total_elevation_gain: number | null
  calories: number | null
  elevation_profile: number[] | null
  type: 'Ride' | 'VirtualRide'
  summary_polyline: string | null
  start_station: string
  end_station: string
  is_commute: boolean
  category: string
  is_manual_override: false
  source_metadata: { format: 'health-auto-export-v2'; distance_missing: boolean; indoor: boolean }
}

export type ImportItem = {
  index: number
  external_activity_id?: string
  status: 'new' | 'exists' | 'suspected_duplicate' | 'failed' | 'skipped'
  message?: string
  candidate_ids?: string[]
  warnings?: string[]
}

export type ImportSummary = Record<ImportItem['status'], number>
export function summarize(items: ImportItem[]): ImportSummary {
  const result: ImportSummary = { new: 0, exists: 0, suspected_duplicate: 0, failed: 0, skipped: 0 }
  for (const item of items) result[item.status]++
  return result
}
