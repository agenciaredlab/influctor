import DashboardLayout from '@/components/layout/DashboardLayout'
import ContractsClient from './ContractsClient'

export default function ContractsPage() {
  return (
    <DashboardLayout
      title="Contratos"
      description="Genera contratos profesionales para tus colaboraciones y brand deals"
    >
      <ContractsClient />
    </DashboardLayout>
  )
}
