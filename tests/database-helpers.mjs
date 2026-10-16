import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'

export const USER_A = '11111111-1111-4111-8111-111111111111'
export const USER_B = '22222222-2222-4222-8222-222222222222'

export async function database(afterBaseline) {
  const db = new PGlite()
  for (const name of (await readdir('neon/migrations')).filter(n => n.endsWith('.sql')).sort()) {
    await db.exec(await readFile(`neon/migrations/${name}`, 'utf8'))
  }
  await db.query("insert into personal_cycleworth.app_users(id,email) values ($1,'a@example.test'),($2,'b@example.test')", [USER_A,USER_B])
  if (afterBaseline) await afterBaseline(db)
  return db
}
export async function asUser(db, user) {
  await db.exec('reset role')
  await db.query("select set_config('cycleworth.user_id', $1, false)", [user ?? ''])
  await db.exec(user ? 'set role cw_user' : 'set role cw_sync')
}
