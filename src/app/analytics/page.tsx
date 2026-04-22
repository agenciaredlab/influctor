import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AnalyticsClient from './AnalyticsClient'
import InstagramStatsBar from '@/components/social/InstagramStatsBar'
import { subDays } from 'date-fns'
import { getSessionUser } from '@/lib/session'


async function getAnalyticsData() {
  const user = await getSessionUser()

  const [incomes, metrics, connectedAccounts] = await Promise.all([
    prisma.income.findMany({
      where: { userId: user.id, date: { gte: subDays(new Date(), 365) } },
      orderBy: { date: 'desc' },
      take: 500,
    }),
    prisma.socialMetric.findMany({
      where: { userId: user.id, date: { gte: subDays(new Date(), 180) } },
      orderBy: { date: 'asc' },
    }),
    prisma.socialAccount.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        snapshots: {
          where:   { date: { gte: subDays(new Date(), 180) } },
          orderBy: { date: 'asc' },
        },
      },
    }),
  ])

  const igAccountRaw = connectedAccounts.find(a => a.platform === 'instagram') ?? null

  // Fetch IG top media and the last 30 snapshots for the stats bar
  let igMedia: any[] = []
  let igSnapshots: any[] = []
  if (igAccountRaw) {
    ;[igMedia, igSnapshots] = await Promise.all([
      prisma.instagramMedia.findMany({
        where: { userId: user.id },
        orderBy: { likeCount: 'desc' },
        take: 6,
      }),
      prisma.socialSnapshot.findMany({
        where: { socialAccountId: igAccountRaw.id },
        orderBy: { date: 'desc' },
        take: 30,
      }),
    ])
  }

  // Merge snapshot data: snapshots win over manual SocialMetric for synced platforms
  const syncedPlatforms = new Set(
    connectedAccounts.filter(a => a.snapshots.length > 0).map(a => a.platform)
  )
  const snapshotMetrics = connectedAccounts.flatMap(a =>
    a.snapshots.map(s => ({
      id:         s.id,
      platform:   a.platform,
      followers:  s.followers,
      engagement: s.engagement,
      date:       s.date.toISOString(),
    }))
  )
  const mergedMetrics = [
    ...metrics
      .filter(m => !syncedPlatforms.has(m.platform))
      .map(m => ({ ...m, date: (m.date as Date).toISOString() })),
    ...snapshotMetrics,
  ].sort((a, b) => a.date.localeCompare(b.date))

  const igAccount = igAccountRaw
    ? {
        ...igAccountRaw,
        lastSyncAt: igAccountRaw.lastSyncAt?.toISOString() ?? null,
      }
    : null

  return {
    user,
    incomes,
    metrics: mergedMetrics,
    igAccount,
    igSnapshots: igSnapshots.map(s => ({ ...s, date: s.date.toISOString() })),
    igMedia:     igMedia.map(m => ({ ...m, timestamp: (m.timestamp as Date).toISOString() })),
  }
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
          account={data.igAccount}
          snapshots={data.igSnapshots}
          topMedia={data.igMedia}
        />
      )}
      <AnalyticsClient data={data} />
    </DashboardLayout>
  )
}
