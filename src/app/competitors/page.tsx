import DashboardLayout from '@/components/layout/DashboardLayout'
import CompetitorsClient from './CompetitorsClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export default async function CompetitorsPage() {
  let competitors: any[] = []
  let plan = 'free'
  try {
    const user = await getSessionUser()
    if (user) {
      plan = user.plan ?? 'free'
      competitors = await prisma.competitor.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    }
  } catch {}

  return (
    <DashboardLayout
      title="Competitor Tracker"
      description="Analiza a tu competencia y descubre sus estrategias de crecimiento"
    >
      <CompetitorsClient initialCompetitors={competitors} plan={plan} />
    </DashboardLayout>
  )
}
