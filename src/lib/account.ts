import { prisma } from '@/lib/prisma'

/**
 * Loads the User row of the ACCOUNT OWNER (the person whose plan, AI quota
 * and data a request operates on).
 *
 * `getApiSession()` returns the *logged-in* person's `id`/`plan`. For a team
 * member that's their own User row (typically plan 'free', no AI usage of
 * their own) -- NOT the account they work for. Anything that checks a plan
 * limit or spends the shared monthly AI quota must therefore read the owner:
 *
 *   const owner = await getAccountUser(sessionUser.accountId)
 *   const plan  = getPlan(owner?.plan ?? 'free')
 *
 * For a solo user / owner, `accountId === id`, so this is just their own row.
 * Returns null if the account no longer exists -- callers should fail closed
 * (treat as 'free').
 */
export async function getAccountUser(accountId: string) {
  return prisma.user.findUnique({ where: { id: accountId } })
}
