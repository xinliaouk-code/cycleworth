import 'server-only'
import { createNeonAuth } from '@neondatabase/auth/next/server'

// Lazy construction allows an unconfigured build, but never an authenticated request.
export function getAuth() {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) throw new Error('Auth unavailable')
  return createNeonAuth({ baseUrl: process.env.NEON_AUTH_BASE_URL, cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET, sessionDataTtl: 60 }, logLevel: 'silent' })
}
