import DashboardLayout from '@/components/layout/DashboardLayout'
import ContractsClient from './ContractsClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export default async function ContractsPage() {
  let plan = 'free'
  try {
    const user = await getSessionUser()
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
