import { prisma } from '@/lib/prisma'

/**
 * The ONLY place in the codebase allowed to set isAdmin: true.
 * Demotes whoever currently holds it (if anyone) and promotes the
 * target, atomically, so there is never more than one admin.
 */
export async function transferAdminRole(newAdminUserId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { isAdmin: true },
      data:  { isAdmin: false },
    })
    return tx.user.update({
      where: { id: newAdminUserId },
      data:  { isAdmin: true },
    })
  })
}