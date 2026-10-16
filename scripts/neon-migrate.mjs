import {readFile,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import pg from 'pg'
const allowedHost='ep-muddy-paper-zah8zu58.c-2.eu-west-2.aws.neon.tech'
export function assertTarget(env=process.env) {
 const url=new URL(env.DATABASE_URL_UNPOOLED??'')
 if(env.NEON_PROJECT_ID!=='falling-sound-48715113'||env.NEON_BRANCH_ID!=='br-royal-waterfall-zanv71f0'||url.hostname!==allowedHost||url.pathname!=='/cycleworth')throw new Error('Refusing unverified Neon target')
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
