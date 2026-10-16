import { healthHandlers } from '../../../../lib/health/handlers.ts'

export const runtime = 'nodejs'
export const maxDuration = 60
export const POST = healthHandlers().sync
