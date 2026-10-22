import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { getStripeSecretKey, getAppUrl } from '@/lib/config'

export async function POST(_req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Billing portal (change plan / cancel / payment methods) is never
    // delegable to a team member: only the real account owner.
    if (sessionUser.accountId !== sessionUser.id) {
      return NextResponse.json(
        { error: 'Solo el dueño de la cuenta puede gestionar el plan y la facturación' },
        { status: 403 }
      )
    }

    const stripeKey = await getStripeSecretKey()
    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Stripe no configurado. Ve a Admin → Configuración.' },
        { status: 503 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: 'No tienes una suscripción activa' }, { status: 404 })
    }

    const appUrl  = (await getAppUrl()) || 'http://localhost:3000'
    const stripe  = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' })
    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripeCustomerId,
      return_url: `${appUrl}/pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe portal POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
