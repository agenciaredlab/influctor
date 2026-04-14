import DashboardLayout from '@/components/layout/DashboardLayout'
import ContractsClient from './ContractsClient'
import { prisma } from '@/lib/prisma'

export default async function ContractsPage() {
  let plan = 'free'
  try {
    const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
    if (user) plan = user.plan ?? 'free'
  } catch {}

  return (
    <DashboardLayout
      title="Contratos"
      description="Genera contratos profesionales para tus colaboraciones y brand deals"
    >
      <ContractsClient plan={plan} />
    </DashboardLayout>
  )
}
