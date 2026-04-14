import DashboardLayout from '@/components/layout/DashboardLayout'
import ReportsClient from './ReportsClient'
import { prisma } from '@/lib/prisma'

export default async function ReportsPage() {
  let data: any = { goals: [], income: [], campaigns: [], aiUsage: [] }
  let plan = 'free'
  try {
    const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
    if (user) {
      plan = user.plan ?? 'free'
      const [goals, income, campaigns, aiUsage] = await Promise.all([
        prisma.goal.findMany({ where: { userId: user.id } }),
        prisma.income.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' }, take: 30 }),
        prisma.campaign.findMany({ where: { userId: user.id } }),
        prisma.aiUsage.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      ])
      data = { goals, income, campaigns, aiUsage }
    }
  } catch {}

  return (
    <DashboardLayout
      title="Reportes Semanales"
      description="Resumen automático de tu progreso, ingresos y actividad"
    >
      <ReportsClient data={data} plan={plan} />
    </DashboardLayout>
  )
}
