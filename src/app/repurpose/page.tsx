import DashboardLayout from '@/components/layout/DashboardLayout'
import RepurposeClient from './RepurposeClient'

export default function RepurposePage() {
  return (
    <DashboardLayout
      title="Repurposing IA"
      description="Transforma un contenido en múltiples formatos para todas tus plataformas"
    >
      <RepurposeClient />
    </DashboardLayout>
  )
}
