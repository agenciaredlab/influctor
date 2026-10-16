import DashboardLayout from '@/components/layout/DashboardLayout'
import CalendarClient from './CalendarClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'


async function getPosts() {
  const user = await getSessionUser()

  const count = await prisma.contentPost.count({ where: { userId: user.accountId } })
  // Seed demo data only for the real account owner — a team member opening an empty
  // workspace must not write into (or burn the quota of) the owner's account.
  if (count === 0 && user.accountId === user.id) {
    const now = new Date()
    const day = (d: number) => new Date(now.getFullYear(), now.getMonth(), d)
    await prisma.contentPost.createMany({
      data: [
        { userId: user.accountId, title: 'Reel: 5 tips de productividad', platform: 'instagram', type: 'reel', status: 'published', publishedAt: day(2), hashtags: '#productividad #tips', viralScore: 78 },
        { userId: user.accountId, title: 'Carrusel: Errores en redes sociales', platform: 'instagram', type: 'carousel', status: 'published', publishedAt: day(5), hashtags: '#marketing #redessociales', viralScore: 82 },
        { userId: user.accountId, title: 'TikTok: POV trabajo desde casa', platform: 'tiktok', type: 'video', status: 'published', publishedAt: day(7), viralScore: 91 },
        { userId: user.accountId, title: 'YouTube: Cómo crecer en 2025', platform: 'youtube', type: 'video', status: 'scheduled', scheduledAt: day(15), viralScore: 75 },
        { userId: user.accountId, title: 'Post: Quote motivacional', platform: 'instagram', type: 'post', status: 'ready', scheduledAt: day(12), viralScore: 55 },
        { userId: user.accountId, title: 'Reel: Day in the life - Creador', platform: 'instagram', type: 'reel', status: 'draft', scheduledAt: day(18), viralScore: 67 },
        { userId: user.accountId, title: 'Thread: Mi journey 0 a 100K', platform: 'twitter', type: 'thread', status: 'idea', viralScore: 73 },
        { userId: user.accountId, title: 'LinkedIn: Lecciones del primer año', platform: 'linkedin', type: 'post', status: 'idea', viralScore: 70 },
        { userId: user.accountId, title: 'TikTok: Trend del momento', platform: 'tiktok', type: 'video', status: 'scheduled', scheduledAt: day(20), viralScore: 88 },
        { userId: user.accountId, title: 'Reel: Tutorial herramienta gratis', platform: 'instagram', type: 'reel', status: 'scheduled', scheduledAt: day(22), viralScore: 80 },
        { userId: user.accountId, title: 'Short: 60 segundos de valor', platform: 'youtube', type: 'short', status: 'draft', scheduledAt: day(25), viralScore: 65 },
        { userId: user.accountId, title: 'Story Poll: ¿Qué contenido quieren?', platform: 'instagram', type: 'story', status: 'idea' },
      ],
    })
  }

  const [posts, igAccount] = await Promise.all([
    prisma.contentPost.findMany({
      where: { userId: user.accountId },
      orderBy: { scheduledAt: 'asc' },
      take: 500,
    }),
    prisma.socialAccount.findFirst({
      where: { userId: user.accountId, platform: 'instagram', isActive: true },
      select: { id: true }, // only used as a boolean — never load the OAuth tokens
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
      <CalendarClient posts={posts} userId={user.accountId} igConnected={igConnected} />
    </DashboardLayout>
  )
}
