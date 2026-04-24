import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { getStripeSecretKey, getAppUrl } from '@/lib/config'

const PLATFORM_FEE_PCT = 0.15 // 15% platform fee

// PATCH /api/marketplace/applications/[id]
// Body: { action: 'accept', agreedRate: number }
// Brand accepts an application and creates a Stripe Checkout session.
// Returns { checkoutUrl } — client redirects there.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  if (body.action !== 'accept') {
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  }

  const agreedRate = Number(body.agreedRate)
  if (!agreedRate || agreedRate <= 0) {
    return NextResponse.json({ error: 'Tarifa inválida' }, { status: 400 })
  }

  // Load application with listing and creator
  const application = await prisma.marketplaceApplication.findUnique({
    where:   { id: params.id },
    include: {
      listing: { select: { id: true, title: true, brandName: true, currency: true, postedById: true } },
      user:    { select: { id: true, name: true, email: true } },
    },
  })
  if (!application) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (application.listing.postedById !== session.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (application.paymentStatus === 'paid') {
    return NextResponse.json({ error: 'Este deal ya fue pagado' }, { status: 400 })
  }

  const stripeKey = await getStripeSecretKey()
  if (!stripeKey) return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })

  const stripe  = new Stripe(stripeKey)
  const base    = (await getAppUrl()) ?? 'http://localhost:3000'
  const currency = (application.listing.currency ?? 'USD').toLowerCase()

  // Amount in cents (includes platform fee)
  const totalCents = Math.round(agreedRate * (1 + PLATFORM_FEE_PCT) * 100)

  const checkoutSession = await stripe.checkout.sessions.create({
    mode:                'payment',
    currency,
    line_items: [
      {
        quantity:    1,
        price_data: {
          currency,
          unit_amount: totalCents,
          product_data: {
            name:        `Deal: ${application.listing.title}`,
            description: `Creador: ${application.user.name} · Tarifa: ${agreedRate} ${application.listing.currency} + 15% comisión de plataforma`,
          },
        },
      },
    ],
    metadata: {
      type:          'marketplace',
      applicationId: application.id,
      agreedRate:    String(agreedRate),
      currency:      application.listing.currency,
    },
    success_url: `${base}/marketplace?deal=paid&app=${application.id}`,
    cancel_url:  `${base}/marketplace?deal=cancelled`,
  })

  // Mark as processing while checkout is pending
  await prisma.marketplaceApplication.update({
    where: { id: application.id },
    data:  {
      status:          'accepted',
      agreedRate,
      paymentStatus:   'processing',
      paymentIntentId: checkoutSession.id,
    },
  })

  return NextResponse.json({ checkoutUrl: checkoutSession.url })
}
