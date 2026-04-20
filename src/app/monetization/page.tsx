import DashboardLayout from '@/components/layout/DashboardLayout'
import MonetizationClient from './MonetizationClient'
import { prisma } from '@/lib/prisma'
import { startOfMonth, subMonths } from 'date-fns'
import { getSessionUser } from '@/lib/session'


async function getData() {
  const user = await getSessionUser()

  const [incomes, latestMetrics] = await Promise.all([
    prisma.income.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' }, take: 500 }),
    prisma.socialMetric.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 10,
    }),
  ])

  // Latest per platform
  const byPlatform: Record<string, any> = {}
  for (const m of latestMetrics) {
    if (!byPlatform[m.platform]) byPlatform[m.platform] = m
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
