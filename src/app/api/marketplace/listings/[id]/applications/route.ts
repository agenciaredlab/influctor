import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

// GET /api/marketplace/listings/[id]/applications
// Returns applications for a listing the current user owns (Pro only).
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: params.id },
    select: { postedById: true },
  })
  if (!listing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (listing.postedById !== session.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const applications = await prisma.marketplaceApplication.findMany({
    where:   { listingId: params.id },
    include: { user: { select: { id: true, name: true, email: true, avatar: true, niche: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    applications: applications.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      paidAt:    a.paidAt?.toISOString() ?? null,
    })),
  })
}
