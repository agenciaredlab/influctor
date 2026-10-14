import DashboardLayout from '@/components/layout/DashboardLayout'
import DealsClient from './DealsClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'


async function getDeals() {
  const user = await getSessionUser()

  // Seed some demo deals if empty
  const count = await prisma.brandDeal.count({ where: { userId: user.accountId } })
  if (count === 0) {
    await prisma.brandDeal.createMany({
      data: [
        { userId: user.accountId, brand: 'Nike Running', platform: 'instagram', type: 'reel', stage: 'active', value: 2500, description: '2 Reels + 3 Stories para colección primavera', deliverables: '["2 Reels", "3 Stories", "1 Post"]', tags: 'deportes,running', dueDate: new Date(Date.now() + 7 * 864e5) },
        { userId: user.accountId, brand: 'Sephora Beauty', platform: 'tiktok', type: 'video', stage: 'negotiation', value: 1800, description: 'Review de nueva línea de skincare', deliverables: '["1 TikTok", "2 Stories"]', tags: 'belleza,skincare' },
        { userId: user.accountId, brand: 'Shopify', platform: 'youtube', type: 'video', stage: 'outreach', value: 3000, description: 'Tutorial sobre cómo abrir tienda online', tags: 'ecommerce,tech' },
        { userId: user.accountId, brand: 'Zara', platform: 'instagram', type: 'ambassador', stage: 'completed', value: 5000, description: 'Campaña temporada invierno - 3 meses', deliverables: '["6 Posts", "12 Stories", "4 Reels"]', tags: 'moda,fashion' },
        { userId: user.accountId, brand: 'Amazon Afiliados', platform: 'youtube', type: 'affiliate', stage: 'active', value: 400, commissionPct: 8, description: 'Links de afiliado en todos los videos', tags: 'afiliados,tech' },
        { userId: user.accountId, brand: 'Airbnb', platform: 'instagram', type: 'sponsored_post', stage: 'contract', value: 1200, description: 'Post viaje colaboración', dueDate: new Date(Date.now() + 14 * 864e5), tags: 'viajes,lifestyle' },
        { userId: user.accountId, brand: 'Adidas', platform: 'multi', type: 'series', stage: 'declined', value: 8000, description: 'Propuesta rechazada - conflicto de agenda', tags: 'deportes' },
      ],
    })
  }

  const deals = await prisma.brandDeal.findMany({
    where: { userId: user.accountId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return { user, deals }
}

export default async function DealsPage() {
  const { user, deals } = await getDeals()
  return (
    <DashboardLayout
      title="Brand Deals Pipeline"
      description="Gestiona tus colaboraciones con marcas de forma profesional"
    >
      <DealsClient deals={deals} userId={user.accountId} />
    </DashboardLayout>
  )
}
