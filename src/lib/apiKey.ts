import crypto from 'crypto'

const KEY_PREFIX = 'ifk_'

/** Generates a new raw API key + its hash. The raw value is returned once and never stored. */
export function generateApiKey() {
  const raw = KEY_PREFIX + crypto.randomBytes(24).toString('base64url')
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 12) }
}

export function hashApiKey(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}