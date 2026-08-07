import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({ error: 'Strava is disabled in Demo Mode.' }, { status: 403 })
}
