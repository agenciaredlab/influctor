import DashboardLayout from '@/components/layout/DashboardLayout'
import ContractsClient from './ContractsClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export default async function ContractsPage() {
  const user = await getSessionUser()
  const plan = user?.plan ?? 'free'

  const contracts = user
    ? await prisma.contract.findMany({
        where:   { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select:  { id: true, title: true, type: true, createdAt: true },
        take:    100,
      })
    : []

  return (
    <DashboardLayout
      title="Contratos"
      description="Genera contratos profesionales para tus colaboraciones y brand deals"
    >
      <ContractsClient
        plan={plan}
        initialContracts={contracts.map(c => ({ ...c, createdAt: c.createdAt.toISOString() }))}
      />
    </DashboardLayout>
  )
}
