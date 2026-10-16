import { currentUser } from '@/lib/auth'
import { scoped } from '@/lib/db/connection'
import { compileQuery, type QueryRequest } from '@/lib/db/query'
import { failure, HttpError, json, readJson } from '@/lib/health/http'
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) throw new HttpError(403,'Cross-origin request blocked')
    const owner = await currentUser()
    const body = await readJson(request) as QueryRequest
    if (!body || typeof body!=='object') throw new HttpError(400,'Invalid request')
    const rows = Array.isArray(body.values)?body.values:[body.values]
    if (rows.length>50) throw new HttpError(400,'Too many records')
    const data = await scoped(owner.id, async db => {
      const result: Record<string,unknown>[]=[]
      for (const row of rows) {
        const query=compileQuery({...body,values:row},owner.id)
        result.push(...(await db.query(query.sql,query.values)).rows)
      }
      if (body.table==='bike_maintenance_history' && body.operation==='select') {
        const tasks=(await db.query('select id,display_name,task_type from personal_cycleworth.bike_maintenance_tasks where user_id=$1',[owner.id])).rows
        for (const entry of result) entry.bike_maintenance_tasks=tasks.find(t=>t.id===entry.task_id)??null
      }
      return result
    })
    return json({data:body.single?(data[0]??null):data,error:null})
  } catch(error) { return failure(error) }
}
