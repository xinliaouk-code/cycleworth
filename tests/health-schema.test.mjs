import assert from 'node:assert/strict'
import test from 'node:test'
import { database, asUser, USER_A, USER_B } from './database-helpers.mjs'

test('Neon schema preserves legacy fields, isolates owners and blocks direct ride insertion', async () => {
 const db=await database()
 try {
  await db.query(`insert into personal_cycleworth.rides(user_id,source,strava_activity_id,external_activity_id,start_date,distance,category,is_manual_override) values($1,'strava',987654321,'987654321','2026-08-01T07:00Z',8200,'日常交通',true)`,[USER_A])
  await asUser(db,USER_A)
  const row=(await db.query('select * from personal_cycleworth.rides')).rows[0]
  assert.equal(row.strava_activity_id,987654321);assert.equal(row.distance,'8200');assert.equal(row.is_manual_override,true)
  await assert.rejects(db.query("insert into personal_cycleworth.rides(user_id,start_date) values($1,now())",[USER_A]),/permission denied/)
  await assert.rejects(db.query('update personal_cycleworth.rides set user_id=$1',[USER_B]),/row-level security/)
  await asUser(db,USER_B)
  assert.equal((await db.query('select * from personal_cycleworth.rides')).rows.length,0)
  await asUser(db,null)
  await assert.rejects(db.exec('select * from personal_cycleworth.rides'),/permission denied/)
 } finally {await db.close()}
})
