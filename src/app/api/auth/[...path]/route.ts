import { getAuth } from '@/lib/auth/server'
// Email/password, verification and reset only; no social or admin proxy surface.
const allowed = new Set(['sign-up/email', 'sign-in/email', 'sign-out', 'get-session', 'request-password-reset', 'reset-password', 'email-otp/send-verification-otp', 'email-otp/verify-email'])
async function handle(request: Request) {
  const path = new URL(request.url).pathname.replace('/api/auth/', '')
  if (!allowed.has(path)) return Response.json({ error: 'Not found' }, { status: 404 })
  try {
    const handler = getAuth().handler()
    return request.method === 'GET' ? handler.GET(request, { params: Promise.resolve({ path: path.split('/') }) }) : handler.POST(request, { params: Promise.resolve({ path: path.split('/') }) })
  } catch { return Response.json({ error: 'Authentication unavailable. Please retry.' }, { status: 503 }) }
}
export const GET = handle
export const POST = handle
