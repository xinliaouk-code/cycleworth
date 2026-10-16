import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto'
export const SOURCE='qmegopdnnkfrnhtohvhe'
export const TABLES=['settings','rides','bike_maintenance_tasks','bike_maintenance_history','health_sync_credentials','health_sync_state']
const normalize=v=>v instanceof Date?v.toISOString():Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])])):v
export const digest=v=>createHash('sha256').update(JSON.stringify(normalize(v))).digest('hex')
export function encrypt(snapshot,key){
 if(!/^[a-f0-9]{64}$/i.test(key??''))throw new Error('A separate 32-byte backup key is required')
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv)
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(snapshot)),cipher.final()])
 return Buffer.concat([Buffer.from('CWV4'),iv,cipher.getAuthTag(),encrypted])
}
export function decrypt(bytes,key){
 if(bytes.subarray(0,4).toString()!=='CWV4')throw new Error('Invalid backup')
 const cipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),bytes.subarray(4,16));cipher.setAuthTag(bytes.subarray(16,32))
 return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(32)),cipher.final()]).toString())
}
export async function exportSource(db){
 await db.query('begin isolation level repeatable read read only')
 try{
  const users=(await db.query('select id,email,email_confirmed_at from auth.users order by id')).rows
  if(users.some(u=>!u.email||!u.email_confirmed_at))throw new Error('Unverified or missing source email requires explicit identity review')
  const available=(await db.query("select table_name from information_schema.tables where table_schema='personal_cycleworth'")).rows.map(r=>r.table_name)
  const tables={}
  for(const table of TABLES){
   if(!available.includes(table)){if(!table.startsWith('health_'))throw new Error('Required source table missing');tables[table]=[];continue}
   tables[table]=(await db.query(`select * from personal_cycleworth.${table}`)).rows
  }
  await db.query('commit')
  return {version:4,source:SOURCE,exported_at:new Date().toISOString(),users,tables,manifest:Object.fromEntries(TABLES.map(t=>[t,{count:tables[t].length,hash:digest(tables[t].map(r=>normalize(r)).sort((a,b)=>String(a.id??a.user_id).localeCompare(String(b.id??b.user_id))))}]))}
 }catch(error){await db.query('rollback');throw error}
}
function migratedRow(table,record){
 const row={...record}
 if(table==='rides'){
  row.source??=row.strava_activity_id==null?'legacy':'strava'
  row.external_activity_id??=row.strava_activity_id==null?null:String(row.strava_activity_id)
 }
 return row
}
export async function importSnapshot(db,snapshot){
 if(snapshot.version!==4||snapshot.source!==SOURCE)throw new Error('Refusing unapproved backup source')
 const ids=new Set(snapshot.users.map(u=>u.id))
 for(const t of TABLES){
  if(!Array.isArray(snapshot.tables[t]))throw new Error('Incomplete backup')
  const rows=snapshot.tables[t]
  if(rows.length!==snapshot.manifest[t].count||digest(rows.map(normalize).sort((a,b)=>String(a.id??a.user_id).localeCompare(String(b.id??b.user_id))))!==snapshot.manifest[t].hash)throw new Error('Backup manifest mismatch')
  if(rows.some(r=>!ids.has(t==='settings'?r.id:r.user_id)))throw new Error('Unknown record owner')
 }
 await db.query('begin')
 try{
  for(const user of snapshot.users){
   if(!user.email_confirmed_at)throw new Error('Source identity is unverified')
   await db.query('insert into personal_cycleworth.app_users(id,email,legacy_user_id) values($1,$2,$1) on conflict(id) do nothing',[user.id,user.email.toLowerCase()])
   const existing=(await db.query('select email from personal_cycleworth.app_users where id=$1',[user.id])).rows[0]
   if(existing.email!==user.email.toLowerCase())throw new Error('Identity mapping conflict')
  }
  const results={}
  for(const table of TABLES){
   const columnInfo=(await db.query("select column_name,data_type from information_schema.columns where table_schema='personal_cycleworth' and table_name=$1",[table])).rows
   const columns=new Set(columnInfo.map(r=>r.column_name))
   for(const original of snapshot.tables[table]){
    const row=migratedRow(table,original),keys=Object.keys(row)
    if(keys.some(k=>!columns.has(k)))throw new Error('Unmapped source field; migration halted')
    await db.query(`insert into personal_cycleworth.${table}(${keys.map(k=>'"'+k+'"').join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) on conflict do nothing`,keys.map(k=>row[k]&&typeof row[k]==='object'&&!(row[k] instanceof Date)?JSON.stringify(row[k]):row[k]))
    const pk=table==='settings'?'id':table.startsWith('health_')?'user_id':'id'
    const target=(await db.query(`select * from personal_cycleworth.${table} where ${pk}=$1`,[row[pk]])).rows[0]
    if(!target)throw new Error('Missing migrated record')
    // PostgreSQL drivers normalize numeric/date representations differently.
    const canonical=(v)=>v instanceof Date?v.toISOString():v
    for(const key of keys){
     const a=canonical(row[key]),b=canonical(target[key])
     const numeric=columnInfo.some(c=>c.column_name===key && ['numeric','double precision','real','integer','bigint'].includes(c.data_type))
     const decimal=v=>String(v).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/,'')
     const equivalent=(numeric&&a!=null&&b!=null&&decimal(a)===decimal(b))||(a===b)||(a!=null&&b!=null&&typeof a!=='object'&&typeof b!=='object'&&String(a)===String(b))||digest(a)===digest(b)||(typeof a==='string'&&/(_at|_date)$/.test(key)&&Date.parse(a)===Date.parse(b))
     if(!equivalent)throw new Error(`Field reconciliation failed: ${table}.${key}`)
    }
   }
   results[table]={source:snapshot.tables[table].length,verified:snapshot.tables[table].length}
  }
  await db.query('commit');return {tables:results,identity_mappings:snapshot.users.length,verified:true}
 }catch(error){await db.query('rollback');throw error}
}
