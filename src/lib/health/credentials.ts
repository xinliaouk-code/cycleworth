import { createHash, randomBytes } from 'node:crypto'

export function newCredential() {
  return `cwha_${randomBytes(32).toString('base64url')}`
}

export function credentialHash(token: string) {
  if (!/^cwha_[A-Za-z0-9_-]{43}$/.test(token)) return null
  return createHash('sha256').update(token).digest('hex')
}
