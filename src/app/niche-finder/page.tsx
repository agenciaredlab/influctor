import DashboardLayout from '@/components/layout/DashboardLayout'
import NicheFinderClient from './NicheFinderClient'

export default function NicheFinderPage() {
  return (
    <DashboardLayout
      title="Niche Finder"
      description="Descubre nichos con alto potencial de crecimiento y monetización"
    >
      <NicheFinderClient />
    </DashboardLayout>
  )
}
