import DashboardLayout from '@/components/layout/DashboardLayout'
import ScriptsClient from './ScriptsClient'

export default function ScriptsPage() {
  return (
    <DashboardLayout
      title="Script Writer"
      description="Genera guiones virales para tus videos con inteligencia artificial"
    >
      <ScriptsClient />
    </DashboardLayout>
  )
}
