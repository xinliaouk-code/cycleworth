import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isDemoDeployment = process.env.NEXT_PUBLIC_APP_MODE === 'demo'

export function proxy(request: NextRequest) {
  if (!isDemoDeployment) return NextResponse.next()

  const { pathname } = request.nextUrl

  // Demo only serves its local mock experience. Do not allow any API handler
  // (including the Strava and Supabase-backed handlers) to run in this project.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'API access is disabled in Demo Mode.' }, { status: 403 })
  }

  if (!['/demo', '/settings', '/maintenance'].includes(pathname) && !pathname.startsWith('/demo/')) {
    return NextResponse.redirect(new URL('/demo', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
