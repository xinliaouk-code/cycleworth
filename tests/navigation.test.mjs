import test from 'node:test'
import assert from 'node:assert/strict'
import {parseNavigation, validNavigation, viewSections, DEFAULT_NAVIGATION} from '../src/lib/navigation.ts'
import {compileQuery} from '../src/lib/db/query.ts'
import {autoExportLink} from '../src/lib/health/auto-export.ts'
import {assertTarget} from '../scripts/neon-migrate.mjs'
test('navigation recovers invalid preferences and keeps every module reachable',()=>{
 assert.deepEqual(parseNavigation(['rides','rides','bike','trends']),DEFAULT_NAVIGATION)
 assert.equal(validNavigation(['sync','settings','rides','overview']),true)
 assert.throws(()=>compileQuery({table:'settings',operation:'upsert',values:{navigation_tabs:['rides']}},'owner'))
 assert.equal(new Set(Object.values(viewSections).flat()).size,9)
})
test('one-tap export defaults to preview, with encoded auth header and bounded cadence',()=>{
 const url=new URL(autoExportLink('https://cycleworth.vercel.app','test&credential'))
 assert.equal(url.protocol,'com.healthexport:')
 assert.equal(url.searchParams.get('headers'),'Authorization,Bearer test&credential,X-CycleWorth-Dry-Run,true')
 assert.equal(url.searchParams.get('url'),'https://cycleworth.vercel.app/api/health/sync')
 assert.equal(url.searchParams.get('batchrequests'),'true')
 assert.ok(new URL(autoExportLink('https://cycleworth.vercel.app','test',true)).searchParams.get('headers').endsWith(',false'))
})
test('production migrations require explicit target and exact branch and endpoint',()=>{
 const env={NEON_PROJECT_ID:'falling-sound-48715113',NEON_BRANCH_ID:'br-little-smoke-za0kxi8g',DATABASE_URL_UNPOOLED:'postgres://user:pass@ep-lively-base-za8umfey.c-2.eu-west-2.aws.neon.tech/cycleworth'}
 assert.throws(()=>assertTarget(env))
 assert.ok(assertTarget({...env,CYCLEWORTH_MIGRATION_TARGET:'production'}))
 assert.throws(()=>assertTarget({...env,CYCLEWORTH_MIGRATION_TARGET:'production',NEON_BRANCH_ID:'wrong'}))
})
