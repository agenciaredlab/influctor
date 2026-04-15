import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DashboardClient from './DashboardClient'
import { subDays, startOfMonth, startOfDay } from 'date-fns'
import { getSessionUser } from '@/lib/session'

async function getDashboardData(userId: string) {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const lastMonthStart = startOfMonth(subDays(monthStart, 1))

  // Parallel data fetching
  const [
    goals,
    campaigns,
    thisMonthIncome,
    lastMonthIncome,
    latestMetrics,
    previousMetrics,
    recentIncomes,
  ] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.campaign.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.income.aggregate({
      where: { userId, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.income.aggregate({
      where: { userId, date: { gte: lastMonthStart, lt: monthStart } },
      _sum: { amount: true },
    }),
    // Latest metric per platform (most recent date)
    prisma.socialMetric.findMany({
      where: {
        userId,
        date: { gte: subDays(now, 10) },
      },
      orderBy: { date: 'desc' },
    }),
    // Previous period metrics for comparison
    prisma.socialMetric.findMany({
      where: {
        userId,
        date: { gte: subDays(now, 40), lt: subDays(now, 10) },
      },
      orderBy: { date: 'desc' },
    }),
    // Recent income entries
    prisma.income.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
    }),
  ])

  // Compute totals
  const platformsSeen = new Set<string>()
  const latestByPlatform: Record<string, typeof latestMetrics[0]> = {}
  for (const m of latestMetrics) {
    if (!platformsSeen.has(m.platform)) {
      platformsSeen.add(m.platform)
      latestByPlatform[m.platform] = m
    }
  }

  const prevPlatformsSeen = new Set<string>()
  const prevByPlatform: Record<string, typeof previousMetrics[0]> = {}
  for (const m of previousMetrics) {
    if (!prevPlatformsSeen.has(m.platform)) {
      prevPlatformsSeen.add(m.platform)
      prevByPlatform[m.platform] = m
    }
  }

  let totalFollowers = 0
  let prevTotalFollowers = 0
  let totalEngagement = 0
  let engagementCount = 0

  for (const [platform, metric] of Object.entries(latestByPlatform)) {
    totalFollowers += metric.followers
    totalEngagement += metric.engagement
    engagementCount++
    if (prevByPlatform[platform]) {
      prevTotalFollowers += prevByPlatform[platform].followers
    }
  }

  const avgEngagement = engagementCount > 0 ? totalEngagement / engagementCount : 0
  let prevTotalEngagement = 0
  let prevEngagementCount = 0
  for (const metric of Object.values(prevByPlatform)) {
    prevTotalEngagement += metric.engagement
    prevEngagementCount++
  }
  const prevAvgEngagement = prevEngagementCount > 0 ? prevTotalEngagement / prevEngagementCount : 0

  const monthlyIncome = thisMonthIncome._sum.amount || 0
  const lastMonthlyIncome = lastMonthIncome._sum.amount || 0
  const incomeChange = lastMonthlyIncome > 0 ? ((monthlyIncome - lastMonthlyIncome) / lastMonthlyIncome) * 100 : 0
  const followerGrowth = prevTotalFollowers > 0 ? ((totalFollowers - prevTotalFollowers) / prevTotalFollowers) * 100 : 0
  const engagementChange = prevAvgEngagement > 0 ? ((avgEngagement - prevAvgEngagement) / prevAvgEngagement) * 100 : 0

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length
  const completedGoals = goals.filter(g => g.status === 'completed').length

  // Monthly income for chart (last 6 months)
  const incomeChart = await prisma.income.findMany({
    where: { userId, date: { gte: subDays(now, 180) } },
    orderBy: { date: 'asc' },
  })

  // Growth chart data (weekly followers across platforms)
  const growthChart = await prisma.socialMetric.findMany({
    where: { userId, date: { gte: subDays(now, 180) } },
    orderBy: { date: 'asc' },
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
  }
}

export default async function DashboardPage() {
  const user = await getSessionUser()
  const data = await getDashboardData(user.id)
  // Merge full user row into data
  ;(data as any).user = user

  return (
    <DashboardLayout
      title="Dashboard"
      description={`Hola, ${data.user.name} · ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
    >
      <DashboardClient data={data} />
    </DashboardLayout>
  )
}
