import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CampaignsClient from './CampaignsClient'

const DEMO_USER_EMAIL = 'demo@influctor.app'

async function getCampaigns() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } })
  if (!user) {
    user = await prisma.user.create({ data: { email: DEMO_USER_EMAIL, name: 'Alex Creator' } })
  }
  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
  return { user, campaigns }
}

export default async function CampaignsPage() {
  const { user, campaigns } = await getCampaigns()
  return (
    <DashboardLayout
      title="Gestión de Campañas"
      description="Crea, gestiona y analiza tus campañas en todas las plataformas"
    >
      <CampaignsClient campaigns={campaigns} userId={user.id} />
    </DashboardLayout>
  )
}
