import { healthHandlers } from '../../../../lib/health/handlers.ts'

export const runtime = 'nodejs'
export const GET = healthHandlers().status
export const POST = healthHandlers().manage
