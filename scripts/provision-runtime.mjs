import pg from 'pg'
import {randomBytes} from 'node:crypto'
import {readFile,writeFile} from 'node:fs/promises'
import {assertTarget} from './neon-migrate.mjs'
const db=new pg.Client({connectionString:assertTarget()})
try{
 await db.connect()
 const exists=(await db.query("select 1 from pg_roles where rolname='cycleworth_app'")).rows.length
 if(!exists){
  const password=randomBytes(36).toString('base64url')
  // Generated base64url alphabet is safe in this DDL literal; never read from input.
  await db.query(`create role cycleworth_app login password '${password}'`)
  await db.query('grant cw_runtime to cycleworth_app')
  const env=await readFile('.env.local','utf8'),uri=new URL(process.env.DATABASE_URL)
  uri.username='cycleworth_app';uri.password=password;uri.searchParams.set('sslmode','verify-full')
  await writeFile('.env.local',env.replace(/^DATABASE_URL=.*$/m,`DATABASE_URL=${uri}`),{mode:0o600})
 }
 console.log('Validation runtime role ready; admin connection remains migration-only')
}catch{console.error('Runtime role provisioning failed');process.exitCode=1}finally{await db.end()}
