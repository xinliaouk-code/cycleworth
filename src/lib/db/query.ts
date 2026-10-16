// A deliberately small, allowlisted protocol used by the existing views.
// It never accepts SQL, schema names, joins, arbitrary operators or owner identity.
import { HttpError } from '../health/http.ts'
const tables = {
  settings: { owner: 'id', write: ['bike_price','tfl_fare_settings','health_commute_settings'], read: ['id','bike_price','tfl_fare_settings','health_commute_settings','created_at','updated_at'], conflict: ['id'] },
  rides: { owner: 'user_id', write: ['category','is_commute','is_manual_override'], read: ['id','user_id','distance','start_date'], conflict: [] },
  bike_maintenance_tasks: { owner: 'user_id', write: ['task_type','display_name','distance_interval_km','time_interval_days','last_completed_at','last_completed_odometer_km','estimated_cost','notes','active'], read: ['id','user_id','active','display_name'], conflict: ['user_id','task_type'] },
  bike_maintenance_history: { owner: 'user_id', write: ['task_id','completed_at','odometer_km','cost','notes'], read: ['id','user_id','completed_at'], conflict: [] },
} as const
export type QueryRequest = { table: string; operation: string; fields?: string; filters?: [string,unknown][]; order?: {column:string;ascending:boolean}; values?: Record<string,unknown> | Record<string,unknown>[]; ignoreDuplicates?: boolean; single?: boolean }
export function compileQuery(input: QueryRequest, owner: string) {
  if (!Object.hasOwn(tables,input.table)) throw new HttpError(400,'Unknown resource')
  const config = tables[input.table as keyof typeof tables]
  const values: unknown[] = []
  const param = (v:unknown) => { values.push(v && typeof v==='object'?JSON.stringify(v):v); return `$${values.length}` }
  const filters = input.filters ?? []
  if (!Array.isArray(filters) || filters.length > 10) throw new HttpError(400,'Invalid filters')
  let where = ` where ${config.owner}=${param(owner)}`
  for (const pair of filters) {
    if (!Array.isArray(pair) || pair.length!==2 || !(['id',config.owner,'active'] as string[]).includes(pair[0])) throw new HttpError(400,'Invalid filter')
    if (pair[0]===config.owner && pair[1]!==owner) throw new HttpError(403,'Owner mismatch')
    where += ` and ${pair[0]}=${param(pair[1])}`
  }
  const table = `personal_cycleworth.${input.table}`
  if (input.operation==='select') {
    const order = input.order
    if (order && !(config.read as readonly string[]).includes(order.column)) throw new HttpError(400,'Invalid order')
    // Known maintenance relation is attached with an owner-scoped join after query.
    return {sql:`select * from ${table}${where}${order?` order by ${order.column} ${order.ascending?'asc':'desc'}`:''}`,values}
  }
  if (!['update','insert','upsert'].includes(input.operation) || (input.table==='rides' && input.operation!=='update')) throw new HttpError(403,'Operation not allowed')
  if (input.operation==='update' && !filters.some(([k])=>k==='id')) throw new HttpError(400,'A record ID is required')
  const rows = Array.isArray(input.values)?input.values:[input.values]
  if (rows.length!==1 || !rows[0] || typeof rows[0]!=='object') throw new HttpError(400,'One record per request')
  const row = {...rows[0]}
  if (row[config.owner] != null && row[config.owner]!==owner) throw new HttpError(403,'Owner mismatch')
  delete row[config.owner]
  if (Object.keys(row).some(k=>!(config.write as readonly string[]).includes(k))) throw new HttpError(400,'Field is not writable')
  if (!Object.keys(row).length) throw new HttpError(400,'No changes')
  if (input.operation==='update') {
    return {sql:`update ${table} set ${Object.entries(row).map(([k,v])=>`${k}=${param(v)}`).join(',')}${where} returning *`,values}
  }
  // INSERT uses a fresh parameter list; WHERE parameters are not part of it.
  values.length=0
  row[config.owner]=owner
  const columns=Object.keys(row)
  const conflict = input.operation==='upsert' && config.conflict.length ? ` on conflict (${config.conflict.join(',')}) ${input.ignoreDuplicates?'do nothing':`do update set ${columns.filter(k=>k!==config.owner && k!=='task_type').map(k=>`${k}=excluded.${k}`).join(',')}`}`:''
  return {sql:`insert into ${table} (${columns.join(',')}) values (${columns.map(k=>param(row[k])).join(',')})${conflict} returning *`,values}
}
