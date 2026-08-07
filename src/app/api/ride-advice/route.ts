import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({ error: 'API access is disabled in Demo Mode.' }, { status: 403 })
}
