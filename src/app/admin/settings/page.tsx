import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'
import { decryptValue, CONFIG_FIELDS } from '@/lib/config'
import DashboardLayout from '@/components/layout/DashboardLayout'
import SettingsClient from './SettingsClient'

export default async function AdminSettingsPage() {
  const sessionUser = await getSessionUser()

  const user = await prisma.user.findUnique({
    where:  { id: sessionUser.id },
    select: { isAdmin: true },
  })
  if (!user?.isAdmin) redirect('/dashboard')

  const rows = await prisma.systemConfig.findMany()
  const decrypted: Record<string, string> = {}
  for (const row of rows) {
    decrypted[row.key] = decryptValue(row.value)
  }

  // Build masked map for client
  type Field = { key: string; label: string; placeholder: string; type: string }
  const allFields = (CONFIG_FIELDS as unknown as Array<{ group: string; fields: Field[] }>).flatMap(g => g.fields)
  const initial: Record<string, string> = {}
  for (const f of allFields) {
    const val = decrypted[f.key] ?? ''
    initial[f.key] = f.type === 'password' && val ? '••••••••' : val
  }

  return (
    <DashboardLayout title="Configuración" description="Servicios externos">
      <SettingsClient initial={initial} />
    </DashboardLayout>
  )
}
