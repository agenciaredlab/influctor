import DashboardLayout from '@/components/layout/DashboardLayout'
import InfluencerDiscoveryClient from './InfluencerDiscoveryClient'

export default function InfluencerDiscoveryPage() {
  return (
    <DashboardLayout
      title="Buscar Influencers"
      description="Encuentra y compara creadores para colaboraciones y campañas de marca"
    >
      <InfluencerDiscoveryClient />
    </DashboardLayout>
  )
}
