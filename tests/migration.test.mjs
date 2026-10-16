import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {TABLES,SOURCE,digest,encrypt,decrypt,importSnapshot} from '../scripts/migration/core.mjs'
import {database,USER_A} from './database-helpers.mjs'

test('encrypted migration preserves every source field and identity, retries safely, detects corruption',async()=>{
 const db=await database()
 try{
  const tables=Object.fromEntries(TABLES.map(t=>[t,[]]))
  tables.rides=[{id:'99999999-9999-4999-8999-999999999999',user_id:USER_A,strava_activity_id:12345,name:'Synthetic legacy',distance:8200,moving_time:1800,elapsed_time:1850,start_date:'2026-08-01T07:00:00.000Z',summary_polyline:'_p~iF~ps|U_ulLnnqC_mqNvxq`@',is_commute:true,category:'日常交通',is_manual_override:true,total_elevation_gain:42,average_speed:4.55,max_speed:8,elevation_profile:[1,2,4]}]
  tables.settings=[{id:USER_A,bike_price:799,tfl_fare_settings:{dailyFare:4.5}}]
  tables.bike_maintenance_tasks=[{id:'88888888-8888-4888-8888-888888888888',user_id:USER_A,task_type:'chain',display_name:'Chain',distance_interval_km:200,last_completed_odometer_km:5}]
  tables.bike_maintenance_history=[{id:'77777777-7777-4777-8777-777777777777',user_id:USER_A,task_id:tables.bike_maintenance_tasks[0].id,odometer_km:5,cost:10,notes:'Synthetic'}]
  const snapshot={version:4,source:SOURCE,users:[{id:USER_A,email:'a@example.test',email_confirmed_at:'2026-01-01T00:00:00Z'}],tables,manifest:Object.fromEntries(TABLES.map(t=>[t,{count:tables[t].length,hash:digest(tables[t])}]))}
  const key=randomBytes(32).toString('hex'),bytes=encrypt(snapshot,key)
  assert.ok(!bytes.includes(Buffer.from('Synthetic legacy')))
  assert.deepEqual(decrypt(bytes,key),snapshot)
  assert.throws(()=>decrypt(bytes,randomBytes(32).toString('hex')))
  const first=await importSnapshot(db,snapshot),second=await importSnapshot(db,snapshot)
  assert.deepEqual(first,second);assert.equal(first.tables.rides.verified,1)
  assert.equal((await db.query('select count(*) n from personal_cycleworth.rides')).rows[0].n,1)
  snapshot.tables.rides[0].distance=999
  await assert.rejects(importSnapshot(db,snapshot),/manifest/)
 }finally{await db.close()}
})
