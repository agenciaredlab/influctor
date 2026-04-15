import DashboardLayout from '@/components/layout/DashboardLayout'
import InfluencerDiscoveryClient from './InfluencerDiscoveryClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export default async function InfluencerDiscoveryPage() {
  let plan = 'free'
  try {
    const user = await getSessionUser()
    if (user) plan = user.plan ?? 'free'
  } catch {}

  return (
    <DashboardLayout
      title="Buscar Influencers"
      description="Encuentra y compara creadores para colaboraciones y campañas de marca"
    >
      <InfluencerDiscoveryClient plan={plan} />
    </DashboardLayout>
  )
}
