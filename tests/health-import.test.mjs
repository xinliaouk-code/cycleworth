import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { database, asUser, USER_A, USER_B } from './database-helpers.mjs'
import { parseWorkouts, healthDate, encodePolyline, DEFAULT_COMMUTE_SETTINGS } from '../src/lib/health/parse.ts'
import { importWorkouts } from '../src/lib/health/import.ts'
import { MAX_BODY_BYTES, readJson } from '../src/lib/health/http.ts'

const fixture = JSON.parse(await readFile('tests/fixtures/health-workouts-v2.json', 'utf8'))
const cycling = fixture.data.workouts[0]
const payload = workout => ({ data: { workouts: [workout] } })

test('V2 parser maps metres, active/elapsed seconds, timezone, GPS and commute', () => {
  const { rides, items } = parseWorkouts(fixture)
  assert.equal(rides.length, 2)
  const ride = rides[0].ride
  assert.equal(ride.distance, 8200)
  assert.equal(ride.moving_time, 1600)
  assert.equal(ride.elapsed_time, 1800)
  assert.equal(ride.start_date, '2026-10-12T07:10:00.000Z')
  assert.equal(ride.source_timezone_offset, '+0100')
  assert.equal(ride.start_station, 'Custom House')
  assert.equal(ride.end_station, 'Bank')
  assert.equal(ride.category, '通勤骑行')
  assert.equal(ride.is_commute, true)
  assert.ok(ride.summary_polyline)
  assert.equal(rides[1].ride.type, 'VirtualRide')
  assert.equal(rides[1].ride.distance, 0)
  assert.equal(rides[1].ride.is_commute, false)
  assert.equal(rides[1].ride.summary_polyline, null)
  assert.ok(items[1].warnings.length)
  assert.equal(items[2].status, 'skipped')
  assert.equal(items[3].status, 'failed')
})

test('polyline matches the standard precision-5 reference vector', () => {
  assert.equal(encodePolyline([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]), '_p~iF~ps|U_ulLnnqC_mqNvxq`@')
})

test('strict dates reject host timezone assumptions and invalid calendar/offset; DST offsets preserve instants', () => {
  for (const value of ['2026-02-30 08:00:00 +0000', '2026-10-12 08:00:00', '2026-10-12 08:00:00 +1500', '2026-10-12 25:00:00 +0000']) assert.throws(() => healthDate(value))
  assert.equal(healthDate('2026-10-25 01:30:00 +0100').iso, '2026-10-25T00:30:00.000Z')
  assert.equal(healthDate('2026-10-25 01:30:00 +0000').iso, '2026-10-25T01:30:00.000Z')
})

test('miles/metres, missing/zero distance, missing/invalid GPS, non-London and indoor rides are safe', () => {
  assert.equal(parseWorkouts(payload({ ...cycling, distance: { qty: 2, units: 'mi' } })).rides[0].ride.distance, 3218.688)
  assert.equal(parseWorkouts(payload({ ...cycling, distance: { qty: 999, units: 'm' } })).rides[0].ride.distance, 999)
  for (const modification of [{ route: null }, { route: [{ latitude: 999, longitude: 0 }] }, { isIndoor: true }, { distance: { qty: 0, units: 'km' } }, { route: [{ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }] }]) {
    assert.equal(parseWorkouts(payload({ ...cycling, ...modification })).rides[0].ride.is_commute, false)
  }
})

test('rejects V1, unsupported units, malformed required fields and oversized batches/routes', () => {
  for (const modification of [{ id: undefined }, { duration: undefined }, { duration: -1 }, { duration: Infinity }, { duration: 5000 }, { start: 'invalid' }, { distance: { qty: -3, units: 'km' } }, { distance: { qty: 4, units: 'yards' } }, { isIndoor: 'false' }, { route: Array(50001).fill({ latitude: 1, longitude: 1 }) }]) {
    assert.equal(parseWorkouts(payload({ ...cycling, ...modification })).items[0].status, 'failed')
  }
  assert.throws(() => parseWorkouts({ version: 1, workouts: [] }))
  assert.throws(() => parseWorkouts({ metrics: [] }))
  assert.throws(() => parseWorkouts({ workouts: Array(101).fill(cycling) }))
})

test('file and cross-batch repeats are idempotent; dry run writes nothing; manual overrides survive; candidates are held', async () => {
  const db = await database()
  try {
    await asUser(db, USER_A)
    const store = async (rides, dryRun) => (await db.query('select personal_cycleworth.health_import($1::jsonb, $2) as result', [JSON.stringify(rides), dryRun])).rows[0].result
    const result = await importWorkouts({ workouts: [cycling, cycling] }, DEFAULT_COMMUTE_SETTINGS, true, store)
    assert.equal(result.summary.new, 1)
    assert.equal(result.summary.exists, 1)
    assert.equal((await db.query('select * from personal_cycleworth.rides')).rows.length, 0)
    assert.equal((await importWorkouts(payload(cycling), DEFAULT_COMMUTE_SETTINGS, false, store)).summary.new, 1)
    await db.exec("update personal_cycleworth.rides set category = '日常交通', is_manual_override = true")
    assert.equal((await importWorkouts(payload(cycling), DEFAULT_COMMUTE_SETTINGS, false, store)).summary.exists, 1)
    assert.equal((await db.query('select category from personal_cycleworth.rides')).rows[0].category, '日常交通')
    await asUser(db, USER_A)
    const overlap = { ...cycling, id: 'other-health-id' }
    assert.equal((await importWorkouts(payload(overlap), DEFAULT_COMMUTE_SETTINGS, false, store)).summary.suspected_duplicate, 1)
    await db.exec('reset role')
    await db.query(`insert into personal_cycleworth.rides (user_id, source, strava_activity_id, external_activity_id, start_date, distance, elapsed_time, category, is_manual_override)
      values ($1, 'strava', 12345, '12345', '2026-10-13T07:10:00Z', 8300, 1800, '休闲骑行', true)`, [USER_A])
    const stravaOverlap = { ...cycling, id: 'strava-overlap', start: '2026-10-13 08:10:00 +0100', end: '2026-10-13 08:40:00 +0100' }
    const held = await importWorkouts(payload(stravaOverlap), DEFAULT_COMMUTE_SETTINGS, false, store)
    assert.equal(held.summary.suspected_duplicate, 1)
    assert.equal(held.items[0].candidate_ids.length, 1)
    assert.equal((await db.query('select * from personal_cycleworth.rides')).rows.length, 2)
    assert.equal((await db.query("select category from personal_cycleworth.rides where source = 'strava'")).rows[0].category, '休闲骑行')
    await asUser(db, USER_B)
    assert.equal((await importWorkouts(payload(cycling), DEFAULT_COMMUTE_SETTINGS, true, store)).summary.new, 1)
    await assert.rejects(db.query('select personal_cycleworth_private.apply_health_import($1,$2,true)', [USER_A, '[]']), /permission denied/)
    await asUser(db, null)
    await assert.rejects(db.query('select personal_cycleworth.health_import($1,true)', ['[]']), /permission denied/)
  } finally { await db.close() }
})

test('JSON body limit enforces actual bytes without trusting content-length', async () => {
  const request = text => new Request('https://cycleworth.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: text })
  await assert.rejects(readJson(request('x'.repeat(MAX_BODY_BYTES + 1))), e => e.status === 413)
  await assert.rejects(readJson(request('{broken')), e => e.status === 400)
  await assert.rejects(readJson(new Request('https://cycleworth.test', { method: 'POST', body: '{}' })), e => e.status === 415)
})

test('preserves routes longer than 5000 points and converts optional physical metrics', () => {
  const route = Array.from({ length: 6001 }, (_, i) => ({ latitude: 51.5 + i / 1e6, longitude: -0.1 + i / 1e6, altitude: i / 10 }))
  const { ride } = parseWorkouts(payload({ ...cycling, route, avgSpeed: { qty: 18, units: 'kmph' }, maxSpeed: { qty: 10, units: 'mph' }, elevationUp: { qty: 100, units: 'ft' }, activeEnergyBurned: { qty: 418.4, units: 'kJ' } })).rides[0]
  assert.equal(ride.summary_polyline, encodePolyline(route.map(p => [p.latitude, p.longitude])))
  assert.equal(ride.average_speed, 5)
  assert.equal(ride.max_speed, 4.4704)
  assert.equal(ride.total_elevation_gain, 30.48)
  assert.ok(Math.abs(ride.calories - 100) < 1e-9)
  assert.equal(ride.elevation_profile.at(-1), 600)
  const missing = parseWorkouts(payload({ ...cycling, maxSpeed: { qty: 20, units: 'unknown' } })).rides[0].ride
  assert.equal(missing.max_speed, null)
})
