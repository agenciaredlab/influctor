import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { hashApiKey } from '@/lib/apiKey'

export interface TeamPermissions {
  canManageContent:         boolean
  canManageDeals:           boolean
  canManageCompetitors:     boolean
  canConnectSocialAccounts: boolean
  canUseAI:                 boolean
  canViewIncome:            boolean
}

const OWNER_PERMISSIONS: TeamPermissions = {
  canManageContent:         true,
  canManageDeals:           true,
  canManageCompetitors:     true,
  canConnectSocialAccounts: true,
  canUseAI:                 true,
  canViewIncome:            true,
}

/**
 * Resolves which account a logged-in user's data operations should be scoped
 * to, and what they're allowed to do there.
 *
 * - Solo user / account owner (100% of users today): `accountId` is their own
 *   id, `permissions` are all true — zero behavior change for anyone not on
 *   a team.
 * - Active team member: `accountId` is the team owner's id (shared plan,
 *   shared AiUsage, shared content/deals/etc. — see lib/plans.ts limits),
 *   `permissions` are exactly what the owner ticked on the TeamMembership row.
 *
 * Callers that need the owner's plan/limits should fetch
 * `prisma.user.findUnique({ where: { id: accountId } })`, same pattern
 * already used everywhere for plan checks — this only resolves *whose*
 * account it is, not the account's data.
 */
export async function resolveAccount(userId: string): Promise<{ accountId: string; permissions: TeamPermissions }> {
  const membership = await prisma.teamMembership.findUnique({
    where: { memberId: userId },
  })
  if (membership && membership.status === 'active') {
    return {
      accountId: membership.ownerId,
      permissions: {
        canManageContent:         membership.canManageContent,
        canManageDeals:           membership.canManageDeals,
        canManageCompetitors:     membership.canManageCompetitors,
        canConnectSocialAccounts: membership.canConnectSocialAccounts,
        canUseAI:                 membership.canUseAI,
        canViewIncome:            membership.canViewIncome,
      },
    }
  }
  return { accountId: userId, permissions: OWNER_PERMISSIONS }
}

/**
 * Use in server pages/layouts.
 * Returns the full User row from DB, plus `accountId`/`permissions` (see
 * resolveAccount above).
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

  const { accountId, permissions } = await resolveAccount(user.id)
  return { ...user, accountId, permissions }
}

/**
 * Use in API routes.
 * Resolves either a normal NextAuth cookie session, or an
 * `Authorization: Bearer <key>` API key (see lib/apiKey.ts) — meant
 * for scripted/automated access, never for browser login.
 * Returns { id, email, name, plan, isAdmin, accountId, permissions } or null
 * if not authenticated. `id` is always the actual logged-in person; use
 * `accountId` (not `id`) to scope shared resources — see resolveAccount above.
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

    const { accountId, permissions } = await resolveAccount(key.user.id)
    return {
      id:      key.user.id,
      email:   key.user.email,
      name:    key.user.name,
      plan:    key.user.plan,
      isAdmin: key.user.isAdmin,
      accountId,
      permissions,
    }
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const { accountId, permissions } = await resolveAccount(session.user.id)
  return { ...session.user, accountId, permissions }
}
