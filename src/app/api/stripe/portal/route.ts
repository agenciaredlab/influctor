import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(_req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY en .env.local' },
        { status: 503 }
      )
    }

    const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No tienes una suscripción activa' },
        { status: 404 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${APP_URL}/pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Portal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
