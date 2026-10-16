import { healthHandlers } from '../../../../lib/health/handlers.ts'

export const runtime = 'nodejs'

export const POST = healthHandlers().history
