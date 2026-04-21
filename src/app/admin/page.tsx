import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AdminClient from './AdminClient'
import { subDays, format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function AdminPage() {
  const sessionUser = await getSessionUser()

  // Fresh DB check — don't rely on potentially stale JWT token
  const user = await prisma.user.findUnique({
    where:  { id: sessionUser.id },
    select: { isAdmin: true },
  })
  if (!user?.isAdmin) redirect('/dashboard')

  const thirtyDaysAgo = subDays(new Date(), 30)

  const [
    totalUsers,
    usersByPlan,
    recentSignups,
    topAiUsers,
    recentUserDates,
    aiAggregate,
    activeSubs,
    totalAiUsages,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['plan'], _count: { _all: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take:    15,
      select:  { id: true, name: true, email: true, plan: true, planStatus: true, createdAt: true },
    }),
    prisma.user.findMany({
      where:   { aiUsageThisMonth: { gt: 0 } },
      orderBy: { aiUsageThisMonth: 'desc' },
      take:    10,
      select:  { id: true, name: true, email: true, plan: true, aiUsageThisMonth: true },
    }),
    prisma.user.findMany({
      where:   { createdAt: { gte: thirtyDaysAgo } },
      select:  { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.aggregate({ _sum: { aiUsageThisMonth: true } }),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.aiUsage.count(),
  ])

  // Plan counts
  const planCounts: Record<string, number> = {}
  for (const row of usersByPlan) {
    planCounts[row.plan] = row._count._all
  }
  const creatorCount = planCounts['creator'] ?? 0
  const proCount     = planCounts['pro']     ?? 0
  const freeCount    = planCounts['free']    ?? 0
  const mrr          = creatorCount * 19 + proCount * 49

  // Build daily signups array (last 30 days, fill zeros)
  const signupMap: Record<string, number> = {}
  for (const u of recentUserDates) {
    const key = format(new Date(u.createdAt), 'dd MMM', { locale: es })
    signupMap[key] = (signupMap[key] ?? 0) + 1
  }
  const dailySignups: { date: string; signups: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d   = subDays(new Date(), i)
    const key = format(d, 'dd MMM', { locale: es })
    dailySignups.push({ date: key, signups: signupMap[key] ?? 0 })
  }

  return (
    <DashboardLayout title="Admin" description="Panel de administración de la plataforma">
      <AdminClient
        stats={{
          totalUsers,
          mrr,
          activeSubs,
          aiThisMonth:  aiAggregate._sum.aiUsageThisMonth ?? 0,
          totalAiUsages,
          freeCount,
          creatorCount,
          proCount,
        }}
        dailySignups={dailySignups}
        recentSignups={recentSignups.map(u => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        topAiUsers={topAiUsers}
      />
    </DashboardLayout>
  )
}
