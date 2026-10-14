import type { TeamPermissions } from '@/lib/session'

/** Account owner / solo user: every flag on (what resolveAccount returns for them). */
export const OWNER_PERMS: TeamPermissions = {
  canManageContent:         true,
  canManageDeals:           true,
  canManageCompetitors:     true,
  canConnectSocialAccounts: true,
  canUseAI:                 true,
  canViewIncome:            true,
}

/** Active team member with nothing granted yet. */
export const NO_PERMS: TeamPermissions = {
  canManageContent:         false,
  canManageDeals:           false,
  canManageCompetitors:     false,
  canConnectSocialAccounts: false,
  canUseAI:                 false,
  canViewIncome:            false,
}

/**
 * Session of an active team member: their OWN `id`/`plan` (a separate User row,
 * typically 'free'), but scoped to the owner's account via `accountId`.
 * Pass the flags the owner ticked; the rest stay false.
 */
export function memberSession(
  grants: Partial<TeamPermissions> = {},
  opts: { id?: string; accountId?: string; plan?: string } = {},
) {
  return {
    id:        opts.id        ?? 'member_1',
    email:     'member@example.com',
    name:      'Member',
    plan:      opts.plan      ?? 'free',
    isAdmin:   false,
    accountId: opts.accountId ?? 'owner_1',
    permissions: { ...NO_PERMS, ...grants },
  }
}
