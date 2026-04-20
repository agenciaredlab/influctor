/**
 * Runs once when the Next.js server starts (both dev and production).
 * Fails fast with a clear error if required env vars are missing,
 * instead of letting the app start and crash later with a cryptic message.
 */
export async function register() {
  const required: { key: string; hint: string }[] = [
    {
      key:  'DATABASE_URL',
      hint: 'Connection string de PostgreSQL. Ver opciones en .env.example.',
    },
    {
      key:  'NEXTAUTH_SECRET',
      hint: 'Genera con: openssl rand -base64 32',
    },
    {
      key:  'NEXTAUTH_URL',
      hint: 'URL pública de la app, ej: https://tudominio.com',
    },
  ]

  // Optional but warn when absent — these cause silent feature failures
  const optional: { key: string; feature: string }[] = [
    { key: 'ANTHROPIC_API_KEY',  feature: 'AI Studio / AB Test / Competitor Research' },
    { key: 'RESEND_API_KEY',     feature: 'reportes por email' },
    { key: 'STRIPE_SECRET_KEY',  feature: 'pagos y suscripciones' },
  ]

  const missing = required.filter(v => !process.env[v.key])

  if (missing.length > 0) {
    const lines = missing.map(v => `  • ${v.key} — ${v.hint}`).join('\n')
    throw new Error(
      `\n\n❌ Variables de entorno requeridas no configuradas:\n${lines}\n\n` +
      `Copia .env.example → .env.local y completa los valores.\n`
    )
  }

  const absent = optional.filter(v => !process.env[v.key])
  if (absent.length > 0) {
    const lines = absent.map(v => `  • ${v.key} (${v.feature})`).join('\n')
    console.warn(
      `\n⚠️  Variables opcionales no configuradas — algunas features estarán desactivadas:\n${lines}\n`
    )
  }
}
