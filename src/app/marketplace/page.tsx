import DashboardLayout from '@/components/layout/DashboardLayout'
import MarketplaceClient from './MarketplaceClient'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/session'

export default async function MarketplacePage() {
  let listings: any[] = []
  let myApplications: any[] = []
  let myListings: any[] = []
  let plan = 'free'
  let stats = { open: 0, brands: 0, totalBudget: 0 }

  try {
    const user = await getSessionUser()
    if (user) plan = user.plan ?? 'free'

    const [rawListings, apps, myRawListings, aggregate] = await Promise.all([
      prisma.marketplaceListing.findMany({
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        include: { _count: { select: { applications: true } } },
        take: 200,
      }),
      user ? prisma.marketplaceApplication.findMany({
        where: { userId: user.id },
        include: { listing: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }) : Promise.resolve([]),
      user ? prisma.marketplaceListing.findMany({
        where: { postedById: user.id },
        include: { _count: { select: { applications: true } } },
        orderBy: { createdAt: 'desc' },
      }) : Promise.resolve([]),
      prisma.marketplaceListing.aggregate({
        where: { status: 'open' },
        _count: { id: true },
        _sum: { budget: true },
      }),
    ])

    const serialize = (l: any) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
      deadline: l.deadline?.toISOString() ?? null,
      applicantsCount: l._count?.applications ?? l.applicantsCount,
    })

    listings = rawListings.map(serialize)
    myListings = myRawListings.map(serialize)

    myApplications = apps.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      paidAt:    a.paidAt?.toISOString() ?? null,
      listing:   serialize(a.listing),
    }))

    const brandNames = new Set(rawListings.map(l => l.brandName))
    stats = {
      open: aggregate._count.id,
      brands: brandNames.size,
      totalBudget: aggregate._sum.budget ?? 0,
    }
  } catch (e) {
    console.error(e)
  }

  return (
    <DashboardLayout
      title="Marketplace de Deals"
      description="Conecta con marcas que buscan creadores como tú"
    >
      <MarketplaceClient
        initialListings={listings}
        myApplications={myApplications}
        myListings={myListings}
        plan={plan}
        stats={stats}
      />
    </DashboardLayout>
  )
}
