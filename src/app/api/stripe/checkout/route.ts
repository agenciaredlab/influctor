import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { PLANS } from '@/lib/plans'
import { getApiSession } from '@/lib/session'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { planId } = await req.json()

    if (!planId || planId === 'free') {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const plan = PLANS[planId as keyof typeof PLANS]
    if (!plan || !plan.priceId) {
      return NextResponse.json(
        { error: 'STRIPE_PRICE_CREATOR o STRIPE_PRICE_PRO no configurados en .env.local' },
        { status: 503 }
      )
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY no configurada. Agrega tu clave en .env.local' },
        { status: 503 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId!, quantity: 1 }],
      success_url: `${APP_URL}/pricing?success=1&plan=${planId}`,
      cancel_url: `${APP_URL}/pricing?canceled=1`,
      subscription_data: {
        metadata: { userId: user.id, plan: planId },
        trial_period_days: 7, // 7-day free trial
      },
      allow_promotion_codes: true,
      metadata: { userId: user.id, plan: planId },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
