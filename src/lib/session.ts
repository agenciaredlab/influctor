import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

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
 * Returns { id, email, name, plan } from the session token.
 * Returns null if not authenticated.
 */
export async function getApiSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user
}
