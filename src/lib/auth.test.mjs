import assert from 'node:assert/strict'
import test from 'node:test'
import { createUserScopedClient } from './auth.ts'

test('creates a CycleWorth client scoped to the verified user token', () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable-test'
  delete process.env['NEXT_PUBLIC_SUPABASE_' + 'ANON_KEY']

  let captured
  const client = createUserScopedClient('verified-user-token', (...args) => {
    captured = args
    return { marker: 'scoped-client' }
  })

  assert.deepEqual(client, { marker: 'scoped-client' })
  assert.equal(captured[0], 'https://example.supabase.co')
  assert.equal(captured[1], 'sb_publishable-test')
  assert.equal(captured[2].db.schema, 'personal_cycleworth')
  assert.equal(captured[2].global.headers.Authorization, 'Bearer verified-user-token')
})

test('does not fall back to the removed anonymous-key environment name', () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  process.env['NEXT_PUBLIC_SUPABASE_' + 'ANON_KEY'] = 'legacy-anon-key'

  let captured
  createUserScopedClient('verified-user-token', (...args) => {
    captured = args
    return { marker: 'scoped-client' }
  })

  assert.equal(captured[1], 'placeholder-publishable-key')
  delete process.env['NEXT_PUBLIC_SUPABASE_' + 'ANON_KEY']
})
