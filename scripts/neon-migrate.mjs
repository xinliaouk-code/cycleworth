import {readFile,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import pg from 'pg'
const targets = { validation: ['br-royal-waterfall-zanv71f0','ep-muddy-paper-zah8zu58.c-2.eu-west-2.aws.neon.tech'], production: ['br-little-smoke-za0kxi8g','ep-lively-base-za8umfey.c-2.eu-west-2.aws.neon.tech'] }
export function assertTarget(env=process.env) {
 const url=new URL(env.DATABASE_URL_UNPOOLED??'')
 const target=targets[env.CYCLEWORTH_MIGRATION_TARGET??'validation']
 if(!target)throw new Error('Unknown migration target')
 if(env.NEON_PROJECT_ID!=='falling-sound-48715113'||env.NEON_BRANCH_ID!==target[0]||url.hostname!==target[1]||url.pathname!=='/cycleworth')throw new Error('Refusing unverified Neon target')
 return url.toString()
}
if(process.argv[1]?.endsWith('neon-migrate.mjs')){
 const db=new pg.Client({connectionString:assertTarget()})
 try{
  await db.connect()
  await db.query('create schema if not exists cycleworth_migration')
  await db.query('create table if not exists cycleworth_migration.schema_versions(name text primary key,sha256 text not null,applied_at timestamptz default now())')
  for(const name of (await readdir('neon/migrations')).filter(n=>n.endsWith('.sql')).sort()){
   const sql=await readFile(`neon/migrations/${name}`,'utf8'),hash=createHash('sha256').update(sql).digest('hex')
   const prior=(await db.query('select sha256 from cycleworth_migration.schema_versions where name=$1',[name])).rows[0]
   if(prior){if(prior.sha256!==hash)throw new Error('Applied migration checksum changed');continue}
   await db.query('begin')
   try{
    await db.query(sql.replace(/^begin;|^commit;/gmi,''))
    await db.query('insert into cycleworth_migration.schema_versions(name,sha256) values($1,$2)',[name,hash])
    await db.query('commit');console.log(`Applied ${name}`)
   }catch(error){await db.query('rollback');throw error}
  }
 }catch{console.error('Neon schema migration failed; no credentials or SQL logged');process.exitCode=1}finally{await db.end()}
}
