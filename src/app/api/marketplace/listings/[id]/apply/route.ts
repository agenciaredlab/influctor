import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/marketplace/listings/[id]/apply
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    if (user.plan === 'free') {
      return NextResponse.json(
        { error: 'Aplicar a oportunidades requiere plan Creator o superior' },
        { status: 403 }
      )
    }

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: params.id },
    })
    if (!listing) return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 404 })
    if (listing.status !== 'open') {
      return NextResponse.json({ error: 'Esta oportunidad ya no está disponible' }, { status: 400 })
    }

    const body = await req.json()
    const { message, proposedRate, portfolio } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'El mensaje es obligatorio' }, { status: 400 })
    }

    const application = await prisma.marketplaceApplication.upsert({
      where: { listingId_userId: { listingId: params.id, userId: user.id } },
      update: { message, proposedRate: proposedRate ? Number(proposedRate) : null, portfolio },
      create: {
        listingId: params.id,
        userId:    user.id,
        message,
        proposedRate: proposedRate ? Number(proposedRate) : null,
        portfolio,
      },
    })

    // Increment applicants count
    await prisma.marketplaceListing.update({
      where: { id: params.id },
      data: { applicantsCount: { increment: 1 } },
    })

    return NextResponse.json({ application })
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya aplicaste a esta oportunidad' }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
