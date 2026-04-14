import DashboardLayout from '@/components/layout/DashboardLayout'
import ABTestClient from './ABTestClient'

export default function ABTestPage() {
  return (
    <DashboardLayout
      title="A/B Captions"
      description="Prueba y compara captions para encontrar cuál convierte mejor"
    >
      <ABTestClient />
    </DashboardLayout>
  )
}
