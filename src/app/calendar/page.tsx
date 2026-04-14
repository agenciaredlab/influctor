import DashboardLayout from '@/components/layout/DashboardLayout'
import CalendarClient from './CalendarClient'
import { prisma } from '@/lib/prisma'

const DEMO_USER_EMAIL = 'demo@influctor.app'

async function getPosts() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } })
  if (!user) user = await prisma.user.create({ data: { email: DEMO_USER_EMAIL, name: 'Alex Creator' } })

  const count = await prisma.contentPost.count({ where: { userId: user.id } })
  if (count === 0) {
    const now = new Date()
    const day = (d: number) => new Date(now.getFullYear(), now.getMonth(), d)
    await prisma.contentPost.createMany({
      data: [
        { userId: user.id, title: 'Reel: 5 tips de productividad', platform: 'instagram', type: 'reel', status: 'published', publishedAt: day(2), hashtags: '#productividad #tips', viralScore: 78 },
        { userId: user.id, title: 'Carrusel: Errores en redes sociales', platform: 'instagram', type: 'carousel', status: 'published', publishedAt: day(5), hashtags: '#marketing #redessociales', viralScore: 82 },
        { userId: user.id, title: 'TikTok: POV trabajo desde casa', platform: 'tiktok', type: 'video', status: 'published', publishedAt: day(7), viralScore: 91 },
        { userId: user.id, title: 'YouTube: Cómo crecer en 2025', platform: 'youtube', type: 'video', status: 'scheduled', scheduledAt: day(15), viralScore: 75 },
        { userId: user.id, title: 'Post: Quote motivacional', platform: 'instagram', type: 'post', status: 'ready', scheduledAt: day(12), viralScore: 55 },
        { userId: user.id, title: 'Reel: Day in the life - Creador', platform: 'instagram', type: 'reel', status: 'draft', scheduledAt: day(18), viralScore: 67 },
        { userId: user.id, title: 'Thread: Mi journey 0 a 100K', platform: 'twitter', type: 'thread', status: 'idea', viralScore: 73 },
        { userId: user.id, title: 'LinkedIn: Lecciones del primer año', platform: 'linkedin', type: 'post', status: 'idea', viralScore: 70 },
        { userId: user.id, title: 'TikTok: Trend del momento', platform: 'tiktok', type: 'video', status: 'scheduled', scheduledAt: day(20), viralScore: 88 },
        { userId: user.id, title: 'Reel: Tutorial herramienta gratis', platform: 'instagram', type: 'reel', status: 'scheduled', scheduledAt: day(22), viralScore: 80 },
        { userId: user.id, title: 'Short: 60 segundos de valor', platform: 'youtube', type: 'short', status: 'draft', scheduledAt: day(25), viralScore: 65 },
        { userId: user.id, title: 'Story Poll: ¿Qué contenido quieren?', platform: 'instagram', type: 'story', status: 'idea' },
      ],
    })
  }

  const [posts, igAccount] = await Promise.all([
    prisma.contentPost.findMany({
      where: { userId: user.id },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.socialAccount.findFirst({
      where: { userId: user.id, platform: 'instagram', isActive: true },
    }),
  ])
  return { user, posts, igConnected: !!igAccount }
}

export default async function CalendarPage() {
  const { user, posts, igConnected } = await getPosts()
  return (
    <DashboardLayout
      title="Calendario de Contenido"
      description={igConnected ? 'Instagram conectado — puedes publicar directamente' : 'Planifica y organiza todo tu contenido en un solo lugar'}
    >
      <CalendarClient posts={posts} userId={user.id} igConnected={igConnected} />
    </DashboardLayout>
  )
}
