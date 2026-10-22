import DashboardLayout from '@/components/layout/DashboardLayout'
import CompetitorsClient from './CompetitorsClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export default async function CompetitorsPage() {
  let competitors: any[] = []
  let plan = 'free'
  // getSessionUser() redirects to /login (NEXT_REDIRECT); keep it outside the try/catch
  // below (fallback for the data queries only) or the redirect is swallowed.
  const user = await getSessionUser()

  try {
    // Plan belongs to the account owner (== the viewer unless they're a team member).
    const owner = user.accountId === user.id
      ? user
      : await prisma.user.findUnique({ where: { id: user.accountId } })
    plan = owner?.plan ?? 'free'
    competitors = await prisma.competitor.findMany({
      where: { userId: user.accountId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
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
