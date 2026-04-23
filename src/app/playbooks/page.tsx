import DashboardLayout from '@/components/layout/DashboardLayout'
import PlaybooksClient from './PlaybooksClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'


async function getData() {
  const user = await getSessionUser()

  const [metrics, connectedAccounts, progress] = await Promise.all([
    prisma.socialMetric.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.socialAccount.findMany({
      where: { userId: user.id, isActive: true },
      include: { snapshots: { orderBy: { date: 'desc' }, take: 1 } },
    }),
    prisma.playbookProgress.findMany({ where: { userId: user.id }, take: 500 }),
  ])

  const byPlatform: Record<string, number> = {}
  for (const m of metrics) {
    if (!(m.platform in byPlatform)) byPlatform[m.platform] = m.followers
  }
  // Snapshot data wins
  for (const account of connectedAccounts) {
    const latest = account.snapshots[0]
    byPlatform[account.platform] = latest?.followers ?? account.followersCount
  }
  const totalFollowers = Object.values(byPlatform).reduce((s, f) => s + f, 0)

  return { user, totalFollowers, progress }
}

export default async function PlaybooksPage() {
  const { user, totalFollowers, progress } = await getData()
  return (
    <DashboardLayout
      title="Growth Playbooks"
      description="Guías paso a paso para crecer en cada etapa de tu carrera como creador"
    >
      <PlaybooksClient userId={user.id} totalFollowers={totalFollowers} savedProgress={progress} />
    </DashboardLayout>
  )
}
