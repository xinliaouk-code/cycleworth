// Runs only against the isolated validation branch. All accounts/data are synthetic.
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import pg from 'pg'
import {assertTarget} from './neon-migrate.mjs'
if (process.env.NEON_BRANCH_ID !== 'br-royal-waterfall-zanv71f0') throw new Error('Synthetic QA is forbidden outside validation')
const base=process.env.QA_BASE_URL??'http://localhost:3004'
const db=new pg.Client({connectionString:assertTarget()})
const fixture=JSON.parse(await readFile('tests/fixtures/health-workouts-v2.json','utf8'))
const results=[]
function check(name,value){assert.ok(value,name);results.push({name,passed:true})}
function client(){
 const cookies=new Map()
 return async(path,body)=>{
  const res=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'})
  for(const cookie of res.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1))}
  return {status:res.status,body:await res.json()}
 }
}
try{
 await db.connect()
 const anon=client();check('Unauthenticated data denied',(await anon('/api/data',{table:'rides',operation:'select'})).status===401)
 const users=[]
 for(let i=0;i<2;i++){
  const email=`cycleworth-v4-${Date.now()}-${i}@example.test`,password=randomBytes(24).toString('base64url'),call=client()
  const signup=await call('/api/auth/sign-up/email',{email,password,name:'V4 synthetic QA'})
  check(`Neon email signup ${i}`,signup.status===200)
  check(`Unverified identity cannot access history ${i}`,(await call('/api/me')).status===403)
  // Test fixture verification only, never a real-user verification or delivery claim.
  await db.query('update neon_auth."user" set "emailVerified"=true where email=$1',[email])
  await call('/api/auth/sign-out',{})
  check(`Neon email login ${i}`,(await call('/api/auth/sign-in/email',{email,password})).status===200)
  const me=await call('/api/me');check(`Verified identity mapped ${i}`,me.status===200&&!!me.body.user.id)
  users.push({email,password,call,id:me.body.user.id})
 }
 const [a,b]=users
 check('Cross-user data filter denied',(await a.call('/api/data',{table:'rides',operation:'select',filters:[['user_id',b.id]]})).status===403)
 const rotated=await a.call('/api/health/credentials',{action:'rotate'})
 check('Dedicated credential issued',rotated.status===200&&!!rotated.body.credential)
 const token=rotated.body.credential
 await a.call('/api/health/credentials',{action:'enable_writes',confirm:true})
 const upload=async(body,tokenValue=token)=>fetch(base+'/api/health/sync',{method:'POST',headers:{Authorization:`Bearer ${tokenValue}`,'Content-Type':'application/json','X-CycleWorth-Dry-Run':'false'},body:JSON.stringify(body)})
 const input={workouts:[{...fixture.data.workouts[0],id:`qa-${Date.now()}`,avgSpeed:{qty:20,units:'kmph'},maxSpeed:{qty:30,units:'kmph'},elevationUp:{qty:100,units:'ft'}}]}
 const first=await upload(input);check('Hosted Health import writes one',(await first.json()).imported===1)
 const repeat=await upload(input);check('Hosted duplicate is idempotent',(await repeat.json()).imported===0)
 const rows=await a.call('/api/data',{table:'rides',operation:'select'});check('GPS and metrics persist',rows.body.data.length===1&&!!rows.body.data[0].summary_polyline&&Math.abs(rows.body.data[0].total_elevation_gain-30.48)<0.001)
 check('Other user cannot see ride',(await b.call('/api/data',{table:'rides',operation:'select'})).body.data.length===0)
 const state=await a.call('/api/health/credentials');check('Sync status matches persisted import',state.body.state.total_imported===1&&!!state.body.state.last_synced_at)
 check('No stored credential disclosure',!JSON.stringify(state.body).includes(token)&&!JSON.stringify(state.body).includes('token_hash'))
 await a.call('/api/health/credentials',{action:'revoke'});check('Revocation blocks old credential',(await upload(input)).status===401)
 await a.call('/api/auth/sign-out',{});check('Signed-out session denied',(await a.call('/api/me')).status===401)
 check('Wrong password denied',(await a.call('/api/auth/sign-in/email',{email:a.email,password:'invalid-password'})).status>=400)
 const reset=await a.call('/api/auth/request-password-reset',{email:a.email,redirectTo:base+'/login?reset=1'})
 results.push({name:'Password reset request API',status:reset.status,mailboxDeliveryVerified:false})
 await mkdir('private',{recursive:true,mode:0o700});await writeFile('private/qa-accounts.json',JSON.stringify(users.map(({email,password,id})=>({email,password,id}))),{mode:0o600})
 await writeFile('evidence/v4/hosted-qa.json',JSON.stringify({synthetic:true,base,results},null,2)+'\n')
 console.log(JSON.stringify({passed:results.filter(r=>r.passed).length,resetRequestStatus:reset.status,realDevice:false}))
}catch(error){console.error('Hosted QA failed:',error instanceof assert.AssertionError?error.message:'service or fixture error');process.exitCode=1}
finally{await db.end()}
