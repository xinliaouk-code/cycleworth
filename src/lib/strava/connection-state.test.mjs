import assert from 'node:assert/strict'
import test from 'node:test'
import { hasStravaConnection } from './connection-state.ts'

test('treats a missing Strava connection row as disconnected', () => {
  assert.equal(hasStravaConnection(null), false)
})

test('treats a Strava connection row as connected', () => {
  assert.equal(hasStravaConnection({ id: 'connection-id' }), true)
})
