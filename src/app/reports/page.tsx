import DashboardLayout from '@/components/layout/DashboardLayout'
import ReportsClient from './ReportsClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export default async function ReportsPage() {
  let plan = 'free'
  let props = {
    goals: [] as any[],
    income: [] as any[],
    aiUsage: [] as any[],
    contentPosts: [] as any[],
    snapshots: [] as any[],
  }

  try {
    const user = await getSessionUser()
    if (user) {
      // Plan belongs to the account owner (== the viewer unless they're a team member).
      const owner = user.accountId === user.id
        ? user
        : await prisma.user.findUnique({ where: { id: user.accountId } })
      plan = owner?.plan ?? 'free'
      const canViewIncome = user.permissions.canViewIncome

      const [goals, income, aiUsage, contentPosts, snapshots] = await Promise.all([
        prisma.goal.findMany({
          where: { userId: user.accountId, status: 'active' },
          orderBy: { priority: 'asc' },
          take: 100,
        }),
        // Team members without canViewIncome never get the owner's income read.
        canViewIncome
          ? prisma.income.findMany({
              where: { userId: user.accountId },
              orderBy: { date: 'desc' },
              take: 60,
            })
          : Promise.resolve([] as Awaited<ReturnType<typeof prisma.income.findMany>>),
        prisma.aiUsage.findMany({
          where: { userId: user.accountId },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        prisma.contentPost.findMany({
          where: { userId: user.accountId, status: 'published' },
          orderBy: { publishedAt: 'desc' },
          take: 10,
        }),
        prisma.socialSnapshot.findMany({
          where: { userId: user.accountId },
          orderBy: { date: 'desc' },
          take: 14,
        }),
      ])

      props = {
        goals: goals.map(g => ({
          title: g.title,
          currentValue: Number(g.currentValue),
          targetValue: Number(g.targetValue),
          unit: g.unit,
          platform: g.platform,
        })),
        income: income.map(i => ({
          amount: Number(i.amount),
          date: i.date.toISOString(),
          source: i.source,
          platform: i.platform,
        })),
        aiUsage: aiUsage.map(a => ({ createdAt: a.createdAt.toISOString() })),
        contentPosts: contentPosts.map(p => ({
          title: p.title,
          platform: p.platform,
          type: p.type,
          publishedAt: p.publishedAt?.toISOString() ?? null,
        })),
        snapshots: snapshots.map(s => ({
          date: s.date.toISOString(),
          platform: s.platform,
          followers: s.followers,
          newFollowers: s.newFollowers,
          reach: s.reach,
          impressions: s.impressions,
          engagement: s.engagement,
        })),
      }
    }
  } catch (e) {
    console.error(e)
  }

  return (
    <DashboardLayout
      title="Reportes Semanales"
      description="Resumen automático de tu progreso, ingresos y actividad"
    >
      <ReportsClient {...props} plan={plan} />
    </DashboardLayout>
  )
}
