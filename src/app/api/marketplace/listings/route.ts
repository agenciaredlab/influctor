import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

// GET /api/marketplace/listings?niche=&platform=&type=&status=open
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const niche    = searchParams.get('niche')
  const platform = searchParams.get('platform')
  const type     = searchParams.get('type')
  const status   = searchParams.get('status') ?? 'open'
  const featured = searchParams.get('featured')

  const where: any = {}
  if (status) where.status = status
  if (niche && niche !== 'Todos') where.niche = niche
  if (type && type !== 'Todos') where.type = type
  if (platform && platform !== 'Todas') where.platforms = { contains: platform }
  if (featured === '1') where.featured = true

  const listings = await prisma.marketplaceListing.findMany({
    where,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { applications: true } } },
    take: 200,
  })

  // Get current user's applications to mark applied listings
  const sessionUser = await getApiSession()
  const appliedIds = sessionUser
    ? (await prisma.marketplaceApplication.findMany({
        where: { userId: sessionUser.id },
        select: { listingId: true, status: true },
      })).reduce<Record<string, string>>((acc, a) => { acc[a.listingId] = a.status; return acc }, {})
    : {}

  return NextResponse.json({ listings, appliedIds })
}

// POST /api/marketplace/listings — Pro users post a new listing
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (user.plan !== 'pro') {
      return NextResponse.json({ error: 'Publicar oportunidades requiere plan Pro' }, { status: 403 })
    }

    const body = await req.json()
    const listing = await prisma.marketplaceListing.create({
      data: {
        title:       body.title,
        brandName:   body.brandName,
        budget:      Number(body.budget) || 0,
        budgetMax:   body.budgetMax ? Number(body.budgetMax) : null,
        budgetType:  body.budgetType ?? 'fixed',
        currency:    body.currency ?? 'USD',
        type:        body.type,
        platforms:   body.platforms,
        niche:       body.niche,
        description: body.description,
        deliverables: body.deliverables,
        requirements: body.requirements,
        deadline:    body.deadline ? new Date(body.deadline) : null,
        location:    body.location,
        postedById:  user.id,
      },
    })
    return NextResponse.json({ listing })
  } catch (err: any) {
    console.error('[marketplace listings POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
