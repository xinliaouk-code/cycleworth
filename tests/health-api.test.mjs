import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { database, asUser, USER_A, USER_B } from './database-helpers.mjs'
import { credentialHash, newCredential } from '../src/lib/health/credentials.ts'
import { healthHandlers } from '../src/lib/health/handlers.ts'
import { parseWorkouts } from '../src/lib/health/parse.ts'

const fixture = JSON.parse(await readFile('tests/fixtures/health-workouts-v2.json', 'utf8'))
const workout = id => ({ ...fixture.data.workouts[0], id,
  start: new Date(Date.now() + 3600000).toISOString(), end: new Date(Date.now() + 5400000).toISOString(),
})
const request = (path, token, body, headers = {}) => new Request(`https://cycleworth.test/api/health/${path}`, {
  method: body === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...headers },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})
function client(db, user) {
  return { rpc: async (name, args = {}) => {
    // Explicit parameter names prevent this fixture adapter from hiding RPC mistakes.
    const names = {
      health_sync_manage: ['p_action', 'p_token_hash', 'p_settings'],
      health_history_import: ['p_rides', 'p_dry_run', 'p_parse_summary'],
      health_import: ['p_rides', 'p_dry_run'],
      health_token_context: ['p_token_hash'],
      health_token_import: ['p_token_hash', 'p_rides', 'p_dry_run', 'p_parse_summary'],
    }[name]
    assert.ok(names, `Unexpected RPC ${name}`)
    const defaults = { p_action: 'status', p_token_hash: null, p_settings: null, p_rides: [], p_dry_run: true, p_parse_summary: {} }
    const values = names.map(key => args[key] ?? defaults[key]).map(value => value && typeof value === 'object' ? JSON.stringify(value) : value)
    try {
      await asUser(db, user)
      return { data: (await db.query(`select personal_cycleworth.${name}(${names.map((_, i) => '$' + (i + 1)).join(',')}) as result`, values)).rows[0].result, error: null }
    } catch (error) { return { data: null, error: { code: error.code } } }
  } }
}

function setup(db, writes = false, historyWrites = false) {
  return healthHandlers({ verify: async t => t === 'session-a' ? USER_A : t === 'session-b' ? USER_B : null,
    sessionClient: owner => client(db, owner), tokenClient: () => client(db, null), writesEnabled: () => writes, historyWritesEnabled: () => historyWrites })
}

test('credentials use 256 random bits and SHA256; no recoverable secret is stored', () => {
  const a = newCredential(), b = newCredential()
  assert.notEqual(a, b)
  assert.match(a, /^cwha_[A-Za-z0-9_-]{43}$/)
  assert.match(credentialHash(a), /^[a-f0-9]{64}$/)
  assert.equal(credentialHash('short'), null)
})

test('HTTP API covers auth, dry-run, disabled writes, owner binding, repeats, partial failures, rotation and revocation', async () => {
  const db = await database()
  try {
    const disabled = setup(db), api = setup(db, true)
    assert.equal((await api.status(request('credentials'))).status, 401)
    assert.equal((await api.manage(request('credentials', newCredential(), { action: 'rotate' }))).status, 401)
    assert.equal((await api.sync(request('sync', 'session-a', {}))).status, 401)
    const rotated = await api.manage(request('credentials', 'session-a', { action: 'rotate', user_id: USER_B }))
    assert.equal(rotated.status, 200)
    assert.equal(rotated.headers.get('cache-control'), 'no-store')
    const { credential, state } = await rotated.json()
    assert.equal(state.enabled, true)
    assert.equal(state.writes_authorized, false)
    assert.ok(!JSON.stringify(state).includes(credentialHash(credential)))
    const body = { data: { workouts: [workout('api-ride')] }, user_id: USER_B }
    const preview = await api.sync(request('sync', credential, body))
    assert.equal(preview.status, 200)
    assert.equal((await preview.json()).imported, 0)
    await asUser(db, USER_A)
    assert.equal((await db.query('select * from personal_cycleworth.rides')).rows.length, 0)
    assert.equal((await disabled.sync(request('sync', credential, body, { 'X-CycleWorth-Dry-Run': 'false' }))).status, 403)
    assert.equal((await disabled.manage(request('credentials', 'session-a', { action: 'enable_writes', confirm: true }))).status, 403)
    assert.equal((await api.manage(request('credentials', 'session-a', { action: 'enable_writes' }))).status, 403)
    assert.equal((await api.manage(request('credentials', 'session-a', { action: 'enable_writes', confirm: true }))).status, 200)
    const written = await api.sync(request('sync', credential, body, { 'X-CycleWorth-Dry-Run': 'false' }))
    assert.equal(written.status, 200)
    assert.equal((await written.json()).imported, 1)
    await asUser(db, USER_A)
    const rows = (await db.query('select * from personal_cycleworth.rides')).rows
    assert.equal(rows.length, 1); assert.equal(rows[0].user_id, USER_A)
    await db.exec("update personal_cycleworth.rides set category = '休闲骑行', is_manual_override = true")
    const repeat = await api.sync(request('sync', credential, body, { 'X-CycleWorth-Dry-Run': 'false' }))
    assert.equal((await repeat.json()).summary.exists, 1)
    const mixed = { workouts: [body.data.workouts[0], { ...workout('invalid-ride'), distance: { qty: 5, units: 'wrong' } }, fixture.data.workouts[2]] }
    const partial = await api.sync(request('sync', credential, mixed))
    assert.equal(partial.status, 207)
    assert.equal((await partial.json()).summary.failed, 1)
    const statusRes = await api.status(request('credentials', 'session-a'))
    const info = await statusRes.json()
    assert.ok(info.state.last_synced_at)
    assert.equal(info.state.last_result.summary.failed, 1)
    assert.ok(!JSON.stringify(info).includes(credential))
    assert.ok(!JSON.stringify(info).includes('token_hash'))
    await asUser(db, USER_A)
    await assert.rejects(db.exec('select * from personal_cycleworth.health_sync_credentials'), /permission denied/)
    await asUser(db, USER_B)
    assert.equal((await db.query('select * from personal_cycleworth.rides')).rows.length, 0)
    assert.equal((await (await api.status(request('credentials', 'session-b'))).json()).state.enabled, false)
    const next = await (await api.manage(request('credentials', 'session-a', { action: 'rotate' }))).json()
    assert.equal(next.state.sync_from, state.sync_from)
    assert.equal(next.state.writes_authorized, false)
    assert.equal((await api.sync(request('sync', credential, body))).status, 401)
    assert.equal((await api.sync(request('sync', next.credential, body))).status, 200)
    assert.equal((await api.manage(request('credentials', 'session-a', { action: 'revoke' }))).status, 200)
    assert.equal((await api.sync(request('sync', next.credential, body))).status, 401)
  } finally { await db.close() }
})

test('token writes can import authorized history; errors, limits, transport and quotas are explicit', async () => {
  const db = await database()
  try {
    const api = setup(db, true)
    const { credential } = await (await api.manage(request('credentials', 'session-a', { action: 'rotate' }))).json()
    await api.manage(request('credentials', 'session-a', { action: 'enable_writes', confirm: true }))
    const history = await api.sync(request('sync', credential, { workouts: [fixture.data.workouts[0]] }, { 'X-CycleWorth-Dry-Run': 'false' }))
    assert.equal(history.status, 200)
    assert.equal((await history.json()).imported, 1)
    assert.equal((await api.sync(request('sync', credential, { metrics: [] }))).status, 400)
    assert.equal((await api.sync(request('sync', credential, { workouts: Array(101).fill(workout('x')) }))).status, 400)
    assert.equal((await api.sync(request('sync', credential, {}, { 'Content-Length': '5000000' }))).status, 413)
    assert.equal((await api.sync(request('sync', credential, {}, { 'Content-Type': 'text/plain' }))).status, 415)
    assert.equal((await api.sync(request('sync', credential, {}, { 'X-CycleWorth-Dry-Run': 'maybe' }))).status, 400)
    assert.equal((await api.sync(request('sync?token=forbidden', credential, {}))).status, 400)
    assert.equal((await api.sync(new Request('http://cycleworth.test/api/health/sync', { method: 'POST' }))).status, 400)
    let rateLimited
    for (let i = 0; i < 35; i++) {
      const res = await api.sync(request('sync', credential, { workouts: [] }))
      if (res.status === 429) { rateLimited = res; break }
    }
    assert.equal(rateLimited?.status, 429)
    assert.equal(rateLimited.headers.get('Retry-After'), '60')
    await asUser(db, USER_A)
    assert.equal((await db.query('select * from personal_cycleworth.rides')).rows.length, 1)
  } finally { await db.close() }
})

test('anonymous callers cannot invoke owner APIs/private import with a chosen owner', async () => {
  const db = await database()
  try {
    await asUser(db, null)
    await assert.rejects(db.query("select personal_cycleworth.health_sync_manage('rotate',$1,null)", ['a'.repeat(64)]), /permission denied/)
    await assert.rejects(db.query('select personal_cycleworth_private.apply_health_import($1,$2,false)', [USER_A, JSON.stringify(parseWorkouts({ workouts: [workout('inject')] }).rides)]), /permission denied/)
    await assert.rejects(db.query('select personal_cycleworth.health_token_context($1)', ['0'.repeat(64)]), /Invalid sync credential/)
    await assert.rejects(db.exec('select * from personal_cycleworth.health_sync_state'), /permission denied/)
    await assert.rejects(db.exec('select * from personal_cycleworth.health_sync_credentials'), /permission denied/)
  } finally { await db.close() }
})

test('history HTTP writes require a separate server gate and explicit confirmation; approved local import is idempotent', async () => {
  const db = await database()
  try {
    const closed = setup(db, true), enabled = setup(db, false, true)
    assert.equal((await enabled.history(request('import', null, fixture))).status, 401)
    const preview = await closed.history(request('import', 'session-a', fixture))
    assert.equal(preview.status, 207)
    assert.equal((await preview.json()).history_writes_enabled, false)
    const write = { ...fixture, dry_run: false, user_id: USER_B }
    assert.equal((await closed.history(request('import', 'session-a', write, { 'X-CycleWorth-Confirm-History': 'import-new-only' }))).status, 403)
    assert.equal((await enabled.history(request('import', 'session-a', write))).status, 403)
    const accepted = await enabled.history(request('import', 'session-a', write, { 'X-CycleWorth-Confirm-History': 'import-new-only' }))
    assert.equal(accepted.status, 207)
    assert.equal((await accepted.json()).imported, 2)
    const repeat = await enabled.history(request('import', 'session-a', write, { 'X-CycleWorth-Confirm-History': 'import-new-only' }))
    assert.equal((await repeat.json()).summary.exists, 2)
    await asUser(db, USER_A)
    assert.equal((await db.query('select * from personal_cycleworth.rides')).rows.length, 2)
    await asUser(db, USER_B)
    assert.equal((await db.query('select * from personal_cycleworth.rides')).rows.length, 0)
  } finally { await db.close() }
})

test('malformed manual uploads record a failure without advancing last success', async () => {
  const db = await database()
  try {
    const api = setup(db, false, true)
    const good = await api.history(request('import', 'session-a', { workouts: [fixture.data.workouts[0]], dry_run: false }, { 'X-CycleWorth-Confirm-History': 'import-new-only' }))
    assert.equal(good.status, 200)
    const before = (await (await api.status(request('credentials','session-a'))).json()).state
    assert.equal((await api.history(request('import', 'session-a', { metrics: [] }))).status, 400)
    const after = (await (await api.status(request('credentials','session-a'))).json()).state
    assert.equal(after.last_synced_at, before.last_synced_at)
    assert.equal(after.total_imported, 1)
    assert.equal(after.last_result.summary.failed, 1)
    assert.equal(after.last_failure_reason, 'Invalid Workout V2 payload')
  } finally { await db.close() }
})
