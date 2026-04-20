import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AnalyticsClient from './AnalyticsClient'
import InstagramStatsBar from '@/components/social/InstagramStatsBar'
import { subDays } from 'date-fns'
import { getSessionUser } from '@/lib/session'


async function getAnalyticsData() {
  const user = await getSessionUser()

  const [incomes, metrics, igAccount] = await Promise.all([
    prisma.income.findMany({
      where: { userId: user.id, date: { gte: subDays(new Date(), 365) } },
      orderBy: { date: 'desc' },
      take: 500,
    }),
    prisma.socialMetric.findMany({
      where: { userId: user.id, date: { gte: subDays(new Date(), 180) } },
      orderBy: { date: 'asc' },
    }),
    prisma.socialAccount.findFirst({
      where: { userId: user.id, platform: 'instagram', isActive: true },
      include: {
        snapshots: { orderBy: { date: 'desc' }, take: 30 },
      },
    }),
  ])

  // Fetch top Instagram media if connected
  let igMedia: any[] = []
  if (igAccount) {
    igMedia = await prisma.instagramMedia.findMany({
      where: { userId: user.id },
      orderBy: { likeCount: 'desc' },
      take: 6,
    })
  }

  return { user, incomes, metrics, igAccount, igMedia }
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()
  return (
    <DashboardLayout
      title="Analytics & Ingresos"
      description={data.igAccount ? `Conectado como @${data.igAccount.username}` : 'Analiza tu crecimiento y mide todas tus fuentes de ingresos'}
    >
      {data.igAccount && (
        <InstagramStatsBar
          account={{
            ...data.igAccount,
            lastSyncAt: data.igAccount.lastSyncAt?.toISOString() ?? null,
          }}
          snapshots={data.igAccount.snapshots.map(s => ({ ...s, date: s.date.toISOString() }))}
          topMedia={data.igMedia.map(m => ({ ...m, timestamp: (m.timestamp as Date).toISOString() }))}
        />
      )}
      <AnalyticsClient data={data} />
    </DashboardLayout>
  )
}
