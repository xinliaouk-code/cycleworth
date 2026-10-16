import test from 'node:test'
import assert from 'node:assert/strict'
import {compileQuery} from '../src/lib/db/query.ts'
import {database,asUser,USER_A,USER_B} from './database-helpers.mjs'

test('data protocol rejects cross-user fields, SQL injection and forbidden writes',()=>{
 const base={table:'rides',operation:'select'}
 assert.throws(()=>compileQuery({...base,table:'rides; drop table rides'},USER_A))
 assert.throws(()=>compileQuery({...base,filters:[['user_id',USER_B]]},USER_A))
 assert.throws(()=>compileQuery({...base,operation:'insert',values:{distance:100}},USER_A))
 assert.throws(()=>compileQuery({...base,operation:'update',filters:[['id','x']],values:{distance:100}},USER_A))
 assert.throws(()=>compileQuery({...base,order:{column:'id; select 1'}},USER_A))
 const q=compileQuery({...base,filters:[['id',"' OR TRUE --"]]},USER_A)
 assert.ok(!q.sql.includes('OR TRUE'));assert.equal(q.values[1],"' OR TRUE --")
})
test('maintenance cannot reference another owner task; settings are scoped',async()=>{
 const db=await database()
 try {
  await asUser(db,USER_B)
  const task=(await db.query("insert into personal_cycleworth.bike_maintenance_tasks(user_id,task_type,display_name) values($1,'test','Test') returning id",[USER_B])).rows[0].id
  await asUser(db,USER_A)
  await assert.rejects(db.query('insert into personal_cycleworth.bike_maintenance_history(task_id,user_id,odometer_km) values($1,$2,10)',[task,USER_A]),/foreign key/)
  const q=compileQuery({table:'settings',operation:'upsert',values:{id:USER_A,bike_price:799}},USER_A)
  await db.query(q.sql,q.values)
  await asUser(db,USER_B)
  assert.equal((await db.query('select * from personal_cycleworth.settings')).rows.length,0)
 }finally{await db.close()}
})
