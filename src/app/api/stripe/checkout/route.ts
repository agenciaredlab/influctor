import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { getStripeSecretKey, getStripePriceCreator, getStripePricePro, getAppUrl } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { planId } = await req.json()

    if (!planId || planId === 'free') {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const stripeKey = await getStripeSecretKey()
    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Stripe no configurado. Configúralo en Admin → Configuración.' },
        { status: 503 }
      )
    }

    const priceId = planId === 'creator'
      ? await getStripePriceCreator()
      : planId === 'pro' ? await getStripePricePro() : ''

    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID para el plan "${planId}" no configurado. Ve a Admin → Configuración.` },
        { status: 503 }
      )
    }

    const appUrl = (await getAppUrl()) || 'http://localhost:3000'
    const stripe  = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' })

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  user.name,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
    }

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:          `${appUrl}/pricing?success=1&plan=${planId}`,
      cancel_url:           `${appUrl}/pricing?canceled=1`,
      subscription_data: {
        metadata:          { userId: user.id, plan: planId },
        trial_period_days: 7,
      },
      allow_promotion_codes: true,
      metadata: { userId: user.id, plan: planId },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe checkout POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
