import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AnalyticsClient from './AnalyticsClient'
import InstagramStatsBar from '@/components/social/InstagramStatsBar'
import { subDays } from 'date-fns'
import { getSessionUser } from '@/lib/session'


async function getAnalyticsData() {
  const user = await getSessionUser()
  // Team members without canViewIncome never get the owner's income read from the DB.
  const canViewIncome = user.permissions.canViewIncome

  const [incomes, metrics, connectedAccounts] = await Promise.all([
    canViewIncome
      ? prisma.income.findMany({
          where: { userId: user.accountId, date: { gte: subDays(new Date(), 365) } },
          orderBy: { date: 'desc' },
          take: 500,
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof prisma.income.findMany>>),
    prisma.socialMetric.findMany({
      where: { userId: user.accountId, date: { gte: subDays(new Date(), 180) } },
      orderBy: { date: 'asc' },
    }),
    prisma.socialAccount.findMany({
      where: { userId: user.accountId, isActive: true },
      // Explicit select: NEVER load accessToken / refreshToken / scopes — this data reaches client components.
      select: {
        id: true,
        platform: true,
        username: true,
        displayName: true,
        profilePicture: true,
        followersCount: true,
        followingCount: true,
        mediaCount: true,
        accountType: true,
        lastSyncAt: true,
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
        where: { userId: user.accountId },
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
        id:             igAccountRaw.id,
        platform:       igAccountRaw.platform,
        username:       igAccountRaw.username,
        displayName:    igAccountRaw.displayName,
        profilePicture: igAccountRaw.profilePicture,
        followersCount: igAccountRaw.followersCount,
        followingCount: igAccountRaw.followingCount,
        mediaCount:     igAccountRaw.mediaCount,
        accountType:    igAccountRaw.accountType,
        lastSyncAt: igAccountRaw.lastSyncAt?.toISOString() ?? null,
      }
    : null

  return {
    // Only what the client needs — never serialize the full User row (hashes, tokens) to the browser.
    user: { id: user.id, name: user.name, email: user.email },
    incomes,
    showIncome: canViewIncome,
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
