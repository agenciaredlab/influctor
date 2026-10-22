import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PricingClient from './PricingClient'
import { getSessionUser } from '@/lib/session'
import { getAccountUser } from '@/lib/account'

export default async function PricingPage() {
  let currentPlan = 'free'
  let planStatus = 'active'
  let subscription: any = null
  let aiUsed = 0
  let isTeamMember = false
  let ownerName: string | null = null

  try {
    const user = await getSessionUser()
    if (user) {
      isTeamMember = user.accountId !== user.id
      if (isTeamMember) {
        // Team member: the plan belongs to the account owner. Only pick the
        // few fields the UI needs -- never forward the owner's full row
        // (password hash, stripeCustomerId...) nor their Subscription.
        const owner = await getAccountUser(user.accountId)
        currentPlan = owner?.plan ?? 'free' // fail closed if the owner is gone
        planStatus = owner?.planStatus ?? 'active'
        aiUsed = owner?.aiUsageThisMonth ?? 0
        ownerName = owner?.name ?? null
      } else {
        currentPlan = user.plan
        planStatus = user.planStatus
        const sub = await prisma.subscription.findUnique({ where: { userId: user.id } })
        subscription = sub
        aiUsed = user.aiUsageThisMonth
      }
    }
  } catch {}

  return (
    <DashboardLayout
      title="Planes & Precios"
      description="Elige el plan que mejor se adapte a tu crecimiento"
    >
      <PricingClient
        currentPlan={currentPlan}
        planStatus={planStatus}
        subscription={subscription ? {
          ...subscription,
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          trialEnd: subscription.trialEnd?.toISOString() ?? null,
        } : null}
        aiUsed={aiUsed}
        isTeamMember={isTeamMember}
        ownerName={ownerName}
      />
    </DashboardLayout>
  )
}
