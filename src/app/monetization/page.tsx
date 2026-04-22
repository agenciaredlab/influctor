import DashboardLayout from '@/components/layout/DashboardLayout'
import MonetizationClient from './MonetizationClient'
import { prisma } from '@/lib/prisma'
import { startOfMonth } from 'date-fns'
import { getSessionUser } from '@/lib/session'


async function getData() {
  const user = await getSessionUser()

  const [incomes, latestMetrics, connectedAccounts] = await Promise.all([
    prisma.income.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' }, take: 500 }),
    prisma.socialMetric.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.socialAccount.findMany({
      where: { userId: user.id, isActive: true },
      include: {
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

  return { user, totalFollowers, avgEngagement, thisMonthIncome, byPlatform, incomes }
}

export default async function MonetizationPage() {
  const data = await getData()
  return (
    <DashboardLayout
      title="Centro de Monetización"
      description="Descubre cuánto vale tu audiencia y cómo maximizar tus ingresos"
    >
      <MonetizationClient data={data} />
    </DashboardLayout>
  )
}
