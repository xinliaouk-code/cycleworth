import { register } from 'node:module'
register('./source-loader.mjs', import.meta.url)
const { calculateROI, prepareChartData, isRideSavingsEligible } = await import('../src/app/dashboard/_lib/utils.ts')
const { DEFAULT_TFL_FARE_SETTINGS } = await import('../src/lib/tfl/fares.ts')
const { maintenanceProgress } = await import('../src/lib/maintenance.ts')
const { parseWorkouts } = await import('../src/lib/health/parse.ts')
const { database, asUser, USER_A } = await import('./database-helpers.mjs')
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const fixture = JSON.parse(await readFile('tests/fixtures/health-workouts-v2.json', 'utf8'))

test('Health rides feed existing commute/savings/chart/maintenance utilities once per accepted ride', async () => {
  const db = await database()
  try {
    await asUser(db, USER_A)
    const rides = parseWorkouts(fixture).rides
    await db.query('select personal_cycleworth.health_import($1::jsonb,false)', [JSON.stringify(rides)])
    await db.query('select personal_cycleworth.health_import($1::jsonb,false)', [JSON.stringify(rides)])
    const rows = (await db.query('select * from personal_cycleworth.rides order by start_date')).rows.map(r => ({ ...r, distance: Number(r.distance), start_date: new Date(r.start_date).toISOString() }))
    assert.equal(rows.length, 2)
    assert.equal(isRideSavingsEligible(rows[0], DEFAULT_TFL_FARE_SETTINGS), true)
    assert.equal(isRideSavingsEligible(rows[1], DEFAULT_TFL_FARE_SETTINGS), false)
    const roi = calculateROI(rows, '799', DEFAULT_TFL_FARE_SETTINGS, 'en')
    assert.ok(Number(roi.estimatedSavings) > 0)
    const chart = prepareChartData(rows, DEFAULT_TFL_FARE_SETTINGS)
    assert.equal(chart.reduce((n, w) => n + w.distance, 0), 8.2)
    const odometer = rows.reduce((n, r) => n + r.distance / 1000, 0)
    const task = { distance_interval_km: 100, time_interval_days: null, last_completed_odometer_km: 0, last_completed_at: new Date().toISOString() }
    assert.ok(Math.abs(maintenanceProgress(task, odometer).kmRemaining - 91.8) < 1e-9)
    const asStrava = rows.map((r, i) => ({ ...r, source: 'strava', external_activity_id: String(i) }))
    assert.deepEqual(prepareChartData(rows, DEFAULT_TFL_FARE_SETTINGS), prepareChartData(asStrava, DEFAULT_TFL_FARE_SETTINGS))
    assert.equal(calculateROI(asStrava, '799', DEFAULT_TFL_FARE_SETTINGS, 'en').estimatedSavings, roi.estimatedSavings)
  } finally { await db.close() }
})

