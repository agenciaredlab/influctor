import DashboardLayout from '@/components/layout/DashboardLayout'
import PlaybooksClient from './PlaybooksClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'


async function getData() {
  const user = await getSessionUser()

  const [metrics, progress] = await Promise.all([
    prisma.socialMetric.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.playbookProgress.findMany({ where: { userId: user.id } }),
  ])

  const byPlatform: Record<string, any> = {}
  for (const m of metrics) {
    if (!byPlatform[m.platform]) byPlatform[m.platform] = m
  }
  const totalFollowers = Object.values(byPlatform).reduce((s: number, m: any) => s + m.followers, 0)

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
