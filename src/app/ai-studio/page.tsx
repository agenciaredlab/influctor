import DashboardLayout from '@/components/layout/DashboardLayout'
import AIStudioClient from './AIStudioClient'
import { prisma } from '@/lib/prisma'

const DEMO_USER_EMAIL = 'demo@influctor.app'

async function getAIHistory() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } })
  if (!user) {
    user = await prisma.user.create({ data: { email: DEMO_USER_EMAIL, name: 'Alex Creator' } })
  }
  const history = await prisma.aiUsage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return { user, history }
}

export default async function AIStudioPage() {
  const { user, history } = await getAIHistory()
  return (
    <DashboardLayout
      title="AI Studio"
      description="Crea contenido increíble con inteligencia artificial"
    >
      <AIStudioClient userId={user.id} history={history} />
    </DashboardLayout>
  )
}
