import { credentialHash, newCredential } from './credentials.ts'
import { importWorkouts } from './import.ts'
import { commuteSettings, isObject, workoutArray } from './parse.ts'
import { bearer, failure, HttpError, json, readJson, MAX_BODY_BYTES } from './http.ts'
import { summarize, type ImportItem } from './types.ts'

export type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string } | null }> }
type Dependencies = {
  verify: (token?: string) => Promise<string | null>
  sessionClient: (token: string) => RpcClient
  tokenClient: () => RpcClient
  writesEnabled: () => boolean
  historyWritesEnabled?: () => boolean
}

const defaults: Dependencies = {
  verify: async token => (await import('../auth')).verifySession(token),
  sessionClient: owner => ({rpc: async (name,args) => (await import('../db/rpc')).rpcClient(owner).rpc(name,args)}),
  tokenClient: () => ({rpc: async (name,args) => (await import('../db/rpc')).rpcClient(null).rpc(name,args)}),
  writesEnabled: () => process.env.APPLE_HEALTH_WRITES_ENABLED === 'true',
  historyWritesEnabled: () => process.env.APPLE_HEALTH_HISTORY_WRITES_ENABLED === 'true',
}

function secureUrl(request: Request) {
  const url = new URL(request.url)
  if (url.search) throw new HttpError(400, 'Use authentication headers; URL query parameters are not accepted')
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new HttpError(400, 'HTTPS is required')
}

async function rpc(db: RpcClient, name: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(name, args)
  if (error) {
    if (error.code === '28000') throw new HttpError(401, 'Invalid or revoked sync credential')
    if (error.code === '54000') throw new HttpError(429, 'Too many sync requests; retry in 60 seconds')
    if (error.code === '42501') throw new HttpError(403, 'New-ride writes are not authorized for this credential')
    throw new HttpError(503, 'Health database unavailable; verify migrations and configuration')
  }
  return data
}

// Dependency injection exercises the actual HTTP handlers against local PostgreSQL.
export function healthHandlers(deps: Dependencies = defaults) {
  async function session(request: Request) {
    secureUrl(request)
    const token = bearer(request)
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Cross-origin request blocked')
    const owner = await deps.verify(token ?? undefined)
    if (!owner) throw new HttpError(401, 'Sign in to manage Apple Health')
    return deps.sessionClient(owner)
  }

  async function status(request: Request) {
    try {
      const db = await session(request)
      const state = await rpc(db, 'health_sync_manage', { p_action: 'status' })
      return json({ state, writes_enabled: deps.writesEnabled(), api_path: '/api/health/sync', max_body_bytes: MAX_BODY_BYTES })
    } catch (error) { return failure(error) }
  }

  async function manage(request: Request) {
    try {
      const db = await session(request)
      const body = await readJson(request)
      if (!isObject(body) || !['rotate', 'revoke', 'save_settings', 'enable_writes', 'disable_writes'].includes(String(body.action))) throw new HttpError(400, 'Invalid credential action')
      if (body.action === 'enable_writes' && (!deps.writesEnabled() || body.confirm !== true)) throw new HttpError(403, 'Writes require server approval and explicit confirmation')
      let settings
      try { settings = body.commute_settings == null ? undefined : commuteSettings(body.commute_settings) }
      catch { throw new HttpError(400, 'Invalid commute settings') }
      if (body.action === 'save_settings' && !settings) throw new HttpError(400, 'Commute settings required')
      const token = body.action === 'rotate' ? newCredential() : undefined
      const state = await rpc(db, 'health_sync_manage', {
        p_action: body.action, p_token_hash: token ? credentialHash(token) : null, p_settings: settings ?? null,
      })
      // One-time disclosure in a no-store response; never put it in source, logs or storage.
      return json({ state, ...(token ? { credential: token } : {}) })
    } catch (error) { return failure(error) }
  }

  async function history(request: Request) {
    let db: RpcClient | undefined
    try {
      db = await session(request)
      const body = await readJson(request)
      if (!isObject(body) || (body.dry_run != null && typeof body.dry_run !== 'boolean')) throw new HttpError(400, 'Expected JSON object with boolean dry_run')
      const dryRun = body.dry_run !== false
      const historyEnabled = deps.historyWritesEnabled?.() === true
      if (!dryRun && (!historyEnabled || request.headers.get('x-cycleworth-confirm-history') !== 'import-new-only')) throw new HttpError(403, 'Historical writes require separate server approval and explicit confirmation')
      let settings
      try { workoutArray(body); settings = commuteSettings(body.commute_settings) }
      catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Invalid history payload') }
      const result = await importWorkouts(body, settings, dryRun, async (rides, preview, validation) => {
        return await rpc(db!, 'health_history_import', { p_rides: rides, p_dry_run: preview, p_parse_summary: summarize(validation) }) as ImportItem[]
      })
      return json({ ...result, history_writes_enabled: historyEnabled }, result.summary.failed ? 207 : 200)
    } catch (error) {
      if (db) {
        try { await rpc(db, 'health_history_import', { p_rides: [], p_dry_run: true, p_parse_summary: { failed: 1, error_code: error instanceof HttpError && error.status === 413 ? 'payload_too_large' : error instanceof HttpError && error.status === 403 ? 'writes_disabled' : error instanceof HttpError && error.message === 'Invalid JSON' ? 'invalid_json' : 'invalid_payload' } }) } catch { /* Preserve the original response. */ }
      }
      return failure(error)
    }
  }

  async function sync(request: Request) {
    let db: RpcClient | undefined, hash: string | null = null, contextReady = false
    try {
      secureUrl(request)
      hash = credentialHash(bearer(request) ?? '')
      if (!hash) throw new HttpError(401, 'Use Authorization: Bearer <CycleWorth sync credential>')
      db = deps.tokenClient()
      const context = await rpc(db, 'health_token_context', { p_token_hash: hash })
      if (!isObject(context)) throw new HttpError(503, 'Sync context unavailable')
      if (context.rate_limited) throw new HttpError(429, 'Too many sync requests; retry in 60 seconds')
      contextReady = true
      const mode = request.headers.get('x-cycleworth-dry-run') ?? 'true'
      if (!['true', 'false'].includes(mode)) throw new HttpError(400, 'X-CycleWorth-Dry-Run must be true or false')
      const dryRun = mode !== 'false'
      if (!dryRun && !deps.writesEnabled()) throw new HttpError(403, 'Apple Health writes are disabled pending approval')
      const body = await readJson(request)
      try { workoutArray(body) } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Invalid Workout V2 payload') }
      const settings = commuteSettings(context.commute_settings)
      const result = await importWorkouts(body, settings, dryRun, async (rides, preview, validation) => {
        return await rpc(db!, 'health_token_import', {
          p_token_hash: hash, p_rides: rides, p_dry_run: preview, p_parse_summary: summarize(validation),
        }) as ImportItem[]
      })
      return json(result, result.summary.failed ? 207 : 200)
    } catch (error) {
      // Record only a fixed summary, never headers, JSON, URLs or arbitrary errors.
      if (contextReady && db && hash) {
        try { await rpc(db, 'health_token_import', { p_token_hash: hash, p_rides: [], p_dry_run: true, p_parse_summary: { failed: 1, error_code: error instanceof HttpError ? (error.status === 413 ? 'payload_too_large' : error.status === 403 ? 'writes_disabled' : error.message === 'Invalid JSON' ? 'invalid_json' : 'invalid_payload') : 'invalid_payload' } }) } catch { /* Response below remains generic. */ }
      }
      const response = failure(error)
      if (response.status === 429) response.headers.set('Retry-After', '60')
      return response
    }
  }
  return { status, manage, sync, history }
}
