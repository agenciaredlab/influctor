import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DashboardClient from './DashboardClient'
import { subDays, startOfMonth } from 'date-fns'
import { getSessionUser } from '@/lib/session'

async function getDashboardData(userId: string, user: { name: string; email: string }) {
  const now            = new Date()
  const monthStart     = startOfMonth(now)
  const lastMonthStart = startOfMonth(subDays(monthStart, 1))

  const [
    goals,
    campaigns,
    thisMonthIncome,
    lastMonthIncome,
    latestMetrics,
    previousMetrics,
    recentIncomes,
    connectedAccounts,
  ] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.campaign.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.income.aggregate({ where: { userId, date: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.income.aggregate({ where: { userId, date: { gte: lastMonthStart, lt: monthStart } }, _sum: { amount: true } }),
    prisma.socialMetric.findMany({ where: { userId, date: { gte: subDays(now, 10) } }, orderBy: { date: 'desc' } }),
    prisma.socialMetric.findMany({ where: { userId, date: { gte: subDays(now, 40), lt: subDays(now, 10) } }, orderBy: { date: 'desc' } }),
    prisma.income.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 5 }),
    // Active OAuth-connected accounts with their 180d snapshots
    prisma.socialAccount.findMany({
      where:   { userId, isActive: true },
      include: {
        snapshots: {
          where:   { date: { gte: subDays(now, 180) } },
          orderBy: { date: 'asc' },
        },
      },
    }),
  ])

  // Build baseline from manually-entered SocialMetric data
  const latestByPlatform: Record<string, { followers: number; engagement: number }> = {}
  const prevByPlatform:   Record<string, { followers: number; engagement: number }> = {}

  const platformsSeen = new Set<string>()
  for (const m of latestMetrics) {
    if (!platformsSeen.has(m.platform)) {
      platformsSeen.add(m.platform)
      latestByPlatform[m.platform] = { followers: m.followers, engagement: m.engagement }
    }
  }
  const prevPlatformsSeen = new Set<string>()
  for (const m of previousMetrics) {
    if (!prevPlatformsSeen.has(m.platform)) {
      prevPlatformsSeen.add(m.platform)
      prevByPlatform[m.platform] = { followers: m.followers, engagement: m.engagement }
    }
  }

  // Override with real synced snapshot data — always more accurate than manual entries
  const snapshotGrowthChart: { platform: string; followers: number; date: string }[] = []

  for (const account of connectedAccounts) {
    const snapshots = account.snapshots
    if (snapshots.length === 0) continue

    const latest = snapshots[snapshots.length - 1]
    latestByPlatform[account.platform] = {
      followers:  latest.followers,
      engagement: latest.engagement,
    }

    // Previous period: find a snapshot ~30d ago for growth comparison
    const prev30 = snapshots.find(s => {
      const daysAgo = (now.getTime() - s.date.getTime()) / 86400000
      return daysAgo >= 25 && daysAgo <= 35
    })
    if (prev30) {
      prevByPlatform[account.platform] = {
        followers:  prev30.followers,
        engagement: prev30.engagement,
      }
    }

    for (const s of snapshots) {
      snapshotGrowthChart.push({ platform: account.platform, followers: s.followers, date: s.date.toISOString() })
    }
  }

  // Compute KPI totals
  let totalFollowers    = 0
  let prevTotalFollowers = 0
  let totalEngagement   = 0
  let engagementCount   = 0

  for (const [platform, metric] of Object.entries(latestByPlatform)) {
    totalFollowers  += metric.followers
    totalEngagement += metric.engagement
    engagementCount++
    if (prevByPlatform[platform]) prevTotalFollowers += prevByPlatform[platform].followers
  }

  const avgEngagement = engagementCount > 0 ? totalEngagement / engagementCount : 0
  let prevTotalEngagement = 0
  let prevEngagementCount = 0
  for (const metric of Object.values(prevByPlatform)) {
    prevTotalEngagement += metric.engagement
    prevEngagementCount++
  }
  const prevAvgEngagement = prevEngagementCount > 0 ? prevTotalEngagement / prevEngagementCount : 0

  const monthlyIncome     = thisMonthIncome._sum.amount  || 0
  const lastMonthlyIncome = lastMonthIncome._sum.amount  || 0
  const incomeChange      = lastMonthlyIncome > 0 ? ((monthlyIncome - lastMonthlyIncome) / lastMonthlyIncome) * 100 : 0
  const followerGrowth    = prevTotalFollowers > 0 ? ((totalFollowers - prevTotalFollowers) / prevTotalFollowers) * 100 : 0
  const engagementChange  = prevAvgEngagement  > 0 ? ((avgEngagement  - prevAvgEngagement)  / prevAvgEngagement)  * 100 : 0

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length
  const completedGoals  = goals.filter(g => g.status === 'completed').length

  const incomeChart = await prisma.income.findMany({
    where: { userId, date: { gte: subDays(now, 180) } },
    orderBy: { date: 'asc' },
  })

  // Growth chart: merge manual entries (for platforms without a real connection)
  // with real snapshot data (which wins for connected platforms)
  const manualGrowthChart = await prisma.socialMetric.findMany({
    where: { userId, date: { gte: subDays(now, 180) } },
    orderBy: { date: 'asc' },
  })
  const syncedPlatforms = new Set(
    connectedAccounts.filter(a => a.snapshots.length > 0).map(a => a.platform)
  )
  const growthChart = [
    ...manualGrowthChart
      .filter(m => !syncedPlatforms.has(m.platform))
      .map(m => ({ platform: m.platform, followers: m.followers, date: m.date.toISOString() })),
    ...snapshotGrowthChart,
  ].sort((a, b) => a.date.localeCompare(b.date))

  // Serialize connected accounts for the client widget
  const serializedAccounts = connectedAccounts.map(a => {
    const latest = a.snapshots[a.snapshots.length - 1]
    return {
      id:             a.id,
      platform:       a.platform,
      username:       a.username,
      displayName:    a.displayName,
      profilePicture: a.profilePicture,
      followersCount: latest?.followers   ?? a.followersCount,
      engagement:     latest?.engagement  ?? 0,
      newFollowers:   latest?.newFollowers ?? 0,
      lastSyncAt:     a.lastSyncAt?.toISOString() ?? null,
    }
  })

  return {
    user,
    goals,
    campaigns,
    stats: {
      totalFollowers,
      followerGrowth,
      avgEngagement,
      engagementChange,
      monthlyIncome,
      incomeChange,
      activeCampaigns,
      goalsCompleted: completedGoals,
      totalGoals: goals.length,
    },
    latestByPlatform,
    recentIncomes,
    incomeChart,
    growthChart,
    connectedAccounts: serializedAccounts,
  }
}

export default async function DashboardPage() {
  const user = await getSessionUser()
  const data = await getDashboardData(user.id, user)

  return (
    <DashboardLayout
      title="Dashboard"
      description={`Hola, ${data.user.name} · ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
    >
      <DashboardClient data={data} />
    </DashboardLayout>
  )
}
