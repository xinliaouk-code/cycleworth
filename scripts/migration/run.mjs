import {readFile,writeFile,mkdir} from 'node:fs/promises'
import pg from 'pg'
import {assertTarget} from '../neon-migrate.mjs'
import {SOURCE,exportSource,importSnapshot,encrypt,decrypt} from './core.mjs'
const [action,file]=process.argv.slice(2)
if(!['export','import'].includes(action)||!file)throw new Error('Usage: run.mjs export|import /private/path/backup.cwv4')
let db
try{
 if(action==='export'){
  const source=new URL(process.env.SUPABASE_SOURCE_DATABASE_URL??'')
  if(source.hostname!==`db.${SOURCE}.supabase.co`||source.pathname!=='/postgres')throw new Error('Refusing source target')
  db=new pg.Client({connectionString:source.toString(),connectionTimeoutMillis:15000});await db.connect()
  const snapshot=await exportSource(db)
  await mkdir(new URL('.',`file://${file}`).pathname,{recursive:true,mode:0o700})
  await writeFile(file,encrypt(snapshot,process.env.MIGRATION_BACKUP_KEY),{mode:0o600,flag:'wx'})
  console.log(JSON.stringify({encrypted_backup:true,counts:Object.fromEntries(Object.entries(snapshot.manifest).map(([k,v])=>[k,v.count]))}))
 }else{
  db=new pg.Client({connectionString:assertTarget(),connectionTimeoutMillis:15000});await db.connect()
  console.log(JSON.stringify(await importSnapshot(db,decrypt(await readFile(file),process.env.MIGRATION_BACKUP_KEY))))
 }
}catch{console.error('BLOCKED: migration failed closed. Source unchanged; no raw records logged.');process.exitCode=1}
finally{await db?.end()}
