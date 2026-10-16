import DashboardLayout from '@/components/layout/DashboardLayout'
import MonetizationClient from './MonetizationClient'
import { prisma } from '@/lib/prisma'
import { startOfMonth } from 'date-fns'
import { getSessionUser } from '@/lib/session'
import Card from '@/components/ui/Card'
import { Lock } from 'lucide-react'


async function getData(user: Awaited<ReturnType<typeof getSessionUser>>) {
  const [incomes, latestMetrics, connectedAccounts] = await Promise.all([
    prisma.income.findMany({ where: { userId: user.accountId }, orderBy: { date: 'desc' }, take: 500 }),
    prisma.socialMetric.findMany({
      where: { userId: user.accountId },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.socialAccount.findMany({
      where: { userId: user.accountId, isActive: true },
      // Explicit select: never load accessToken / refreshToken / scopes.
      select: {
        platform: true, followersCount: true,
        snapshots: { orderBy: { date: 'desc' }, take: 1 },
      },
    }),
  ])

  // Latest per platform — snapshot data wins over manual SocialMetric
  const byPlatform: Record<string, any> = {}
  for (const m of latestMetrics) {
    if (!byPlatform[m.platform]) byPlatform[m.platform] = { followers: m.followers, engagement: m.engagement }
  }
  for (const account of connectedAccounts) {
    const latest = account.snapshots[0]
    if (latest) {
      byPlatform[account.platform] = { followers: latest.followers, engagement: latest.engagement }
    } else if (!byPlatform[account.platform]) {
      byPlatform[account.platform] = { followers: account.followersCount, engagement: 0 }
    }
  }

  const totalFollowers = Object.values(byPlatform).reduce((s: number, m: any) => s + m.followers, 0)
  const avgEngagement = Object.values(byPlatform).length > 0
    ? Object.values(byPlatform).reduce((s: number, m: any) => s + m.engagement, 0) / Object.values(byPlatform).length
    : 0

  const thisMonthIncome = incomes
    .filter(i => new Date(i.date) >= startOfMonth(new Date()))
    .reduce((s, i) => s + i.amount, 0)

  return { totalFollowers, avgEngagement, thisMonthIncome, byPlatform, incomes }
}

export default async function MonetizationPage() {
  const user = await getSessionUser()

  // Team members without canViewIncome must not see (or even load) the owner's income.
  if (!user.permissions.canViewIncome) {
    return (
      <DashboardLayout
        title="Centro de Monetización"
        description="Descubre cuánto vale tu audiencia y cómo maximizar tus ingresos"
      >
        <Card className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
            <Lock size={22} className="text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">Sin acceso a los ingresos</h3>
          <p className="text-sm text-gray-500">No tienes permiso para ver los ingresos de esta cuenta.</p>
        </Card>
      </DashboardLayout>
    )
  }

  const data = await getData(user)
  return (
    <DashboardLayout
      title="Centro de Monetización"
      description="Descubre cuánto vale tu audiencia y cómo maximizar tus ingresos"
    >
      <MonetizationClient data={data} />
    </DashboardLayout>
  )
}
