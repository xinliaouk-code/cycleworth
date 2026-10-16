export const MAX_BODY_BYTES = 4 * 1024 * 1024

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}

export function bearer(request: Request) {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') ?? '')
  return match?.[1]
}

export async function readJson(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new HttpError(415, 'Use Content-Type: application/json')
  const declared = request.headers.get('content-length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) throw new HttpError(413, 'Payload exceeds 4 MiB; enable Batch Requests or shorten date range')
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError(400, 'Missing JSON body')
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new HttpError(413, 'Payload exceeds 4 MiB; enable Batch Requests or shorten date range') }
    chunks.push(value)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown }
  catch { throw new HttpError(400, 'Invalid JSON') }
}

export function failure(error: unknown) {
  return json({ error: error instanceof HttpError ? error.message : 'Import unavailable; check configuration and retry' }, error instanceof HttpError ? error.status : 503)
}
