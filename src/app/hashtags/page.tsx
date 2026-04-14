import DashboardLayout from '@/components/layout/DashboardLayout'
import HashtagsClient from './HashtagsClient'

export default function HashtagsPage() {
  return (
    <DashboardLayout
      title="Hashtag Explorer"
      description="Encuentra los mejores hashtags para maximizar el alcance de tu contenido"
    >
      <HashtagsClient />
    </DashboardLayout>
  )
}
