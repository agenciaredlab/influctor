import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PricingClient from './PricingClient'
import { getSessionUser } from '@/lib/session'

export default async function PricingPage() {
  let currentPlan = 'free'
  let planStatus = 'active'
  let subscription: any = null
  let aiUsed = 0

  try {
    const user = await getSessionUser()
    if (user) {
      currentPlan = user.plan
      planStatus = user.planStatus
      const sub = await prisma.subscription.findUnique({ where: { userId: user.id } })
      subscription = sub
      aiUsed = user.aiUsageThisMonth
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
      />
    </DashboardLayout>
  )
}
