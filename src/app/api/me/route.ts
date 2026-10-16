import { currentUser } from '@/lib/auth'
import { failure, json } from '@/lib/health/http'
export async function GET() {
  try { return json({ user: await currentUser() }) } catch(error) { return failure(error) }
}
