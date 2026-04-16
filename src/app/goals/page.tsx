import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import GoalsClient from './GoalsClient'
import { getSessionUser } from '@/lib/session'


async function getGoals() {
  const user = await getSessionUser()
    if (!user) {
    user = await prisma.user.create({
      data: { email: DEMO_USER_EMAIL, name: 'Alex Creator' },
    })
  }
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  })
  return { user, goals }
}

export default async function GoalsPage() {
  const { user, goals } = await getGoals()

  return (
    <DashboardLayout
      title="Metas & Objetivos"
      description="Establece y rastrea tus objetivos de crecimiento con evaluación automática"
    >
      <GoalsClient goals={goals} userId={user.id} />
    </DashboardLayout>
  )
}
