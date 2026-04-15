import DashboardLayout from '@/components/layout/DashboardLayout'
import AIStudioClient from './AIStudioClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

async function getAIHistory(userId: string) {
  const history = await prisma.aiUsage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return history
}

export default async function AIStudioPage() {
  const user = await getSessionUser()
  const history = await getAIHistory(user.id)

  return (
    <DashboardLayout
      title="AI Studio"
      description="Crea contenido increíble con inteligencia artificial"
    >
      <AIStudioClient userId={user.id} history={history} />
    </DashboardLayout>
  )
}
