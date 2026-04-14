import DashboardLayout from '@/components/layout/DashboardLayout'
import OutreachClient from './OutreachClient'

export default function OutreachPage() {
  return (
    <DashboardLayout
      title="Outreach Kit"
      description="Plantillas de contacto profesionales y tracker de respuestas para brand deals"
    >
      <OutreachClient />
    </DashboardLayout>
  )
}
