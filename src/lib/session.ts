import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { hashApiKey } from '@/lib/apiKey'

/**
 * Use in server pages/layouts.
 * Returns the full User row from DB.
 * Redirects to /login if not authenticated.
 */
export async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  if (!user) redirect('/login')
  if (!user.active) redirect('/login')
  return user
}

/**
 * Use in API routes.
 * Resolves either a normal NextAuth cookie session, or an
 * `Authorization: Bearer <key>` API key (see lib/apiKey.ts) — meant
 * for scripted/automated access, never for browser login.
 * Returns { id, email, name, plan, isAdmin } or null if not authenticated.
 */
export async function getApiSession() {
  const authHeader = headers().get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const raw = authHeader.slice(7).trim()
    if (!raw) return null

    const key = await prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(raw) },
      include: { user: true },
    })
    if (!key || key.revokedAt || !key.user.active) return null

    prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

    return {
      id:      key.user.id,
      email:   key.user.email,
      name:    key.user.name,
      plan:    key.user.plan,
      isAdmin: key.user.isAdmin,
    }
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user
}
