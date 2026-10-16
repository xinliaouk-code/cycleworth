import 'server-only'
import { Pool, types, type PoolClient } from 'pg'
// Existing statistics expect numbers, not PostgreSQL NUMERIC strings.
types.setTypeParser(1700, Number)
let pool: Pool | undefined
export function databasePool() {
  if (!process.env.DATABASE_URL) throw new Error('Database unavailable')
  return pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 15000, idleTimeoutMillis: 15000, statement_timeout: 20000 })
}
// Retry connection establishment only. Never replay an ambiguously committed write.
export async function connect(): Promise<PoolClient> {
  for (let attempt = 0; ; attempt++) {
    try { return await databasePool().connect() }
    catch (error) { if (attempt >= 2) throw error; await new Promise(resolve => setTimeout(resolve, 200 * 2 ** attempt)) }
  }
}
export async function scoped<T>(owner: string | null, work: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await connect()
  try {
    await db.query('begin')
    await db.query(owner ? 'set local role cw_user' : 'set local role cw_sync')
    await db.query("select set_config('cycleworth.user_id', $1, true)", [owner ?? ''])
    const result = await work(db)
    await db.query('commit')
    return result
  } catch (error) { await db.query('rollback').catch(() => {}); throw error }
  finally { db.release() }
}
