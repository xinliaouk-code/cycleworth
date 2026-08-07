import { NextResponse } from 'next/server'

export function POST() {
  return NextResponse.json({ error: 'Strava connection is disabled in Demo Mode.' }, { status: 403 })
}
