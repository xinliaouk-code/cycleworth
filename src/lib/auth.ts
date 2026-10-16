import 'server-only'
import { getAuth } from './auth/server'
import { connect } from './db/connection'
import { HttpError } from './health/http'

export async function currentUser() {
  // Check revocation upstream on every protected request, bypassing the signed cache.
  const { data: session, error } = await getAuth().getSession({ query: { disableCookieCache: 'true' } })
  if (error && error.status >= 500) throw new HttpError(503, 'Authentication unavailable. Please retry.')
  if (error || !session?.user) throw new HttpError(401, 'Sign in to CycleWorth')
  const user = session.user
  // An unverified signup must never claim a migrated user's history.
  if (!user.emailVerified) throw new HttpError(403, 'Verify your email before accessing CycleWorth')
  const email = user.email.toLowerCase()
  const db = await connect()
  try {
    const result = await db.query(`select * from personal_cycleworth.resolve_identity($1,$2)`, [user.id,email])
    if (!result.rows[0]) throw new HttpError(403, 'Identity mapping requires review')
    return result.rows[0] as {id: string; email: string}
  } finally { db.release() }
}
export async function verifySession(_token?: string) {
  try { return (await currentUser()).id } catch (error) { if (error instanceof HttpError && error.status === 401) return null; throw error }
}
