import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import DashboardLayout from '@/components/layout/DashboardLayout'
import UsersClient from './UsersClient'

export default async function AdminUsersPage() {
  const sessionUser = await getSessionUser()

  const user = await prisma.user.findUnique({
    where:  { id: sessionUser.id },
    select: { isAdmin: true },
  })
  if (!user?.isAdmin) redirect('/dashboard')

  return (
    <DashboardLayout title="Usuarios" description="Gestión de cuentas de la plataforma">
      <UsersClient currentAdminId={sessionUser.id} />
    </DashboardLayout>
  )
}