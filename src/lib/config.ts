/**
 * System configuration — reads from SystemConfig table first, then env vars.
 * Values in the DB are encrypted with AES-256-GCM using NEXTAUTH_SECRET.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { prisma } from '@/lib/prisma'

// Derive a 32-byte key from NEXTAUTH_SECRET
function getEncKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET ?? 'influctor-fallback-secret-change-me'
  return scryptSync(secret, 'influctor-config-salt', 32)
}

export function encryptValue(plain: string): string {
  const key = getEncKey()
  const iv  = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc  = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag  = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decryptValue(stored: string): string {
  try {
    const [ivHex, tagHex, encHex] = stored.split(':')
    const key     = getEncKey()
    const iv      = Buffer.from(ivHex,  'hex')
    const tag     = Buffer.from(tagHex, 'hex')
    const enc     = Buffer.from(encHex, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(enc) + decipher.final('utf8')
  } catch {
    return ''
  }
}

// In-process cache: expires every 60 s so changes propagate quickly
const cache = new Map<string, { value: string; at: number }>()
const TTL   = 60_000

async function dbGet(key: string): Promise<string | null> {
  const now    = Date.now()
  const cached = cache.get(key)
  if (cached && now - cached.at < TTL) return cached.value

  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } })
    if (!row) { cache.set(key, { value: '', at: now }); return null }
    const value = decryptValue(row.value)
    cache.set(key, { value, at: now })
    return value || null
  } catch {
    return null
  }
}

export async function dbSet(key: string, plain: string) {
  cache.delete(key)
  const value = encryptValue(plain)
  await prisma.systemConfig.upsert({
    where:  { key },
    create: { key, value },
    update: { value },
  })
}

export async function dbDelete(key: string) {
  cache.delete(key)
  await prisma.systemConfig.deleteMany({ where: { key } })
}

/** Returns DB value first, env var as fallback, empty string if neither set. */
export async function getConfig(key: string, envKey?: string): Promise<string> {
  const fromDb = await dbGet(key)
  if (fromDb) return fromDb
  return envKey ? (process.env[envKey] ?? '') : ''
}

// ── Typed accessors ──────────────────────────────────────────────────────────

export async function getStripeSecretKey()      { return getConfig('stripe_secret_key',      'STRIPE_SECRET_KEY') }
export async function getStripeWebhookSecret()  { return getConfig('stripe_webhook_secret',   'STRIPE_WEBHOOK_SECRET') }
export async function getStripePriceCreator()   { return getConfig('stripe_price_creator',   'STRIPE_PRICE_CREATOR') }
export async function getStripePricePro()       { return getConfig('stripe_price_pro',        'STRIPE_PRICE_PRO') }
export async function getAnthropicKey()         { return getConfig('anthropic_api_key',       'ANTHROPIC_API_KEY') }
export async function getResendKey()            { return getConfig('resend_api_key',          'RESEND_API_KEY') }
export async function getInstagramAppId()       { return getConfig('instagram_app_id',        'INSTAGRAM_APP_ID') }
export async function getInstagramAppSecret()   { return getConfig('instagram_app_secret',    'INSTAGRAM_APP_SECRET') }
export async function getTikTokClientKey()      { return getConfig('tiktok_client_key',       'TIKTOK_CLIENT_KEY') }
export async function getTikTokClientSecret()   { return getConfig('tiktok_client_secret',    'TIKTOK_CLIENT_SECRET') }
export async function getCronSecret()           { return getConfig('cron_secret',             'CRON_SECRET') }
export async function getAppUrl()               { return getConfig('app_url',                 'NEXT_PUBLIC_APP_URL') }

// All known config keys with metadata (for the admin UI)
export const CONFIG_FIELDS = [
  {
    group:  'Stripe',
    fields: [
      { key: 'stripe_secret_key',     label: 'Secret Key',             placeholder: 'sk_live_...',   type: 'password' },
      { key: 'stripe_webhook_secret', label: 'Webhook Secret',         placeholder: 'whsec_...',     type: 'password' },
      { key: 'stripe_price_creator',  label: 'Price ID — Creator ($19)', placeholder: 'price_...',   type: 'text' },
      { key: 'stripe_price_pro',      label: 'Price ID — Pro ($49)',    placeholder: 'price_...',     type: 'text' },
    ],
  },
  {
    group:  'Anthropic (IA)',
    fields: [
      { key: 'anthropic_api_key', label: 'API Key', placeholder: 'sk-ant-...', type: 'password' },
    ],
  },
  {
    group:  'Resend (Email)',
    fields: [
      { key: 'resend_api_key', label: 'API Key', placeholder: 're_...', type: 'password' },
    ],
  },
  {
    group:  'Instagram / Meta',
    fields: [
      { key: 'instagram_app_id',     label: 'App ID',     placeholder: '123456789', type: 'text' },
      { key: 'instagram_app_secret', label: 'App Secret', placeholder: 'abc123...',  type: 'password' },
    ],
  },
  {
    group:  'TikTok',
    fields: [
      { key: 'tiktok_client_key',    label: 'Client Key',    placeholder: 'aw...',    type: 'text' },
      { key: 'tiktok_client_secret', label: 'Client Secret', placeholder: 'abc123...', type: 'password' },
    ],
  },
  {
    group:  'App',
    fields: [
      { key: 'app_url',     label: 'URL Pública',    placeholder: 'https://tudominio.com', type: 'text' },
      { key: 'cron_secret', label: 'Cron Secret',    placeholder: 'secreto-largo-aleatorio', type: 'password' },
    ],
  },
] as const

export type ConfigKey = typeof CONFIG_FIELDS[number]['fields'][number]['key']
