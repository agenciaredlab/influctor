import DashboardLayout from '@/components/layout/DashboardLayout'
import CompetitorsClient from './CompetitorsClient'
import { prisma } from '@/lib/prisma'

export default async function CompetitorsPage() {
  let competitors: any[] = []
  try {
    const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
    if (user) {
      competitors = await prisma.competitor.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })
    }
  } catch {}

  return (
    <DashboardLayout
      title="Competitor Tracker"
      description="Analiza a tu competencia y descubre sus estrategias de crecimiento"
    >
      <CompetitorsClient initialCompetitors={competitors} />
    </DashboardLayout>
  )
}
