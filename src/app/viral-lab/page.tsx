import DashboardLayout from '@/components/layout/DashboardLayout'
import ViralLabClient from './ViralLabClient'

export default function ViralLabPage() {
  return (
    <DashboardLayout
      title="Viral Lab"
      description="Analiza el potencial viral de tu contenido antes de publicarlo"
    >
      <ViralLabClient />
    </DashboardLayout>
  )
}
