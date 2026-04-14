import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PricingClient from './PricingClient'

export default async function PricingPage() {
  let currentPlan = 'free'
  let planStatus = 'active'
  let subscription: any = null
  let aiUsed = 0

  try {
    const user = await prisma.user.findFirst({
      where: { email: 'demo@influctor.app' },
      include: { subscription: true },
    })
    if (user) {
      currentPlan = user.plan
      planStatus = user.planStatus
      subscription = user.subscription
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
