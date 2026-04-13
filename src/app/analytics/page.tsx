import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AnalyticsClient from './AnalyticsClient'
import { subDays, startOfMonth } from 'date-fns'

const DEMO_USER_EMAIL = 'demo@influctor.app'

async function getAnalyticsData() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } })
  if (!user) {
    user = await prisma.user.create({ data: { email: DEMO_USER_EMAIL, name: 'Alex Creator' } })
  }

  const [incomes, metrics] = await Promise.all([
    prisma.income.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
    }),
    prisma.socialMetric.findMany({
      where: { userId: user.id, date: { gte: subDays(new Date(), 180) } },
      orderBy: { date: 'asc' },
    }),
  ])

  return { user, incomes, metrics }
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()
  return (
    <DashboardLayout
      title="Analytics & Ingresos"
      description="Analiza tu crecimiento y mide todas tus fuentes de ingresos"
    >
      <AnalyticsClient data={data} />
    </DashboardLayout>
  )
}
