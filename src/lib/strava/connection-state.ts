export type StravaConnectionRow = { id: string } | null

export function hasStravaConnection(connection: StravaConnectionRow): boolean {
  return connection !== null
}
