import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PricingClient from './PricingClient'
import { getSessionUser } from '@/lib/session'
import { getAccountUser } from '@/lib/account'

export default async function PricingPage() {
  let currentPlan = 'free'
  let planStatus = 'active'
  let subscription: {
    currentPeriodEnd: string
    trialEnd: string | null
    cancelAtPeriodEnd: boolean
    status: string
  } | null = null
  let aiUsed = 0
  let ownerName: string | null = null

  // getSessionUser() redirects to /login (NEXT_REDIRECT) for no session / inactive
  // user / deactivated team owner. It must stay OUTSIDE the try/catch below, which
  // would swallow the redirect and render the page with owner defaults.
  const user = await getSessionUser()
  const isTeamMember = user.accountId !== user.id

  try {
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
      aiUsed = user.aiUsageThisMonth
      const sub = await prisma.subscription.findUnique({ where: { userId: user.id } })
      // Only the fields PricingClient renders -- never forward the raw row
      // (stripeSubscriptionId, stripeCustomerId, stripePriceId, userId).
      if (sub) {
        subscription = {
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
          trialEnd: sub.trialEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          status: sub.status,
        }
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
        subscription={subscription}
        aiUsed={aiUsed}
        isTeamMember={isTeamMember}
        ownerName={ownerName}
      />
    </DashboardLayout>
  )
}
