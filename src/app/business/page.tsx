import DashboardLayout from '@/components/layout/DashboardLayout'
import BusinessClient from './BusinessClient'

export default function BusinessPage() {
  return (
    <DashboardLayout
      title="Herramientas Pro para Empresas"
      description="ROI de influencers, calculadora de campañas y análisis competitivo"
    >
      <BusinessClient />
    </DashboardLayout>
  )
}
