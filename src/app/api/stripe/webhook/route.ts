import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getStripeSecretKey, getStripeWebhookSecret, getStripePriceCreator, getStripePricePro } from '@/lib/config'
import { sendDealSelectedEmail } from '@/lib/email'

function mapStatus(status: Stripe.Subscription.Status): string {
  const map: Record<string, string> = {
    active: 'active', trialing: 'trialing', past_due: 'past_due',
    canceled: 'canceled', incomplete: 'incomplete',
    incomplete_expired: 'canceled', unpaid: 'past_due', paused: 'canceled',
  }
  return map[status] ?? 'active'
}

function getSubscriptionPeriod(subscription: Stripe.Subscription): { start: number; end: number } {
  const item = subscription.items?.data?.[0] as any
  return {
    start: item?.current_period_start ?? (subscription as any).current_period_start ?? Math.floor(Date.now() / 1000),
    end:   item?.current_period_end   ?? (subscription as any).current_period_end   ?? Math.floor(Date.now() / 1000) + 30 * 86400,
  }
}

async function getPlanFromPriceId(priceId: string): Promise<string> {
  const [proPriceId, creatorPriceId] = await Promise.all([getStripePricePro(), getStripePriceCreator()])
  if (priceId === proPriceId)     return 'pro'
  if (priceId === creatorPriceId) return 'creator'
  return 'free'
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription, stripe: Stripe) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  const priceId  = subscription.items.data[0]?.price.id ?? ''
  const plan     = await getPlanFromPriceId(priceId)
  const status   = mapStatus(subscription.status)
  const isActive = ['active', 'trialing'].includes(status)
  const { start, end } = getSubscriptionPeriod(subscription)

  await prisma.$transaction([
    prisma.subscription.upsert({
      where:  { stripeSubscriptionId: subscription.id },
      update: {
        status, plan, stripePriceId: priceId,
        currentPeriodStart: new Date(start * 1000),
        currentPeriodEnd:   new Date(end   * 1000),
        cancelAtPeriodEnd:  subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        trialEnd:   subscription.trial_end   ? new Date(subscription.trial_end   * 1000) : null,
        updatedAt:  new Date(),
      },
      create: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId:     subscription.customer as string,
        stripePriceId: priceId, plan, status,
        currentPeriodStart: new Date(start * 1000),
        currentPeriodEnd:   new Date(end   * 1000),
        cancelAtPeriodEnd:  subscription.cancel_at_period_end,
        canceledAt:   subscription.canceled_at   ? new Date(subscription.canceled_at   * 1000) : null,
        trialStart:   subscription.trial_start   ? new Date(subscription.trial_start   * 1000) : null,
        trialEnd:     subscription.trial_end     ? new Date(subscription.trial_end     * 1000) : null,
        userId,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data:  { plan: isActive ? plan : 'free', planStatus: status, planCurrentPeriodEnd: new Date(end * 1000) },
    }),
  ])
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data:  { status: 'canceled', canceledAt: new Date() },
    }),
    prisma.user.update({ where: { id: userId }, data: { plan: 'free', planStatus: 'canceled' } }),
  ])
}

async function handleMarketplacePayment(session: Stripe.Checkout.Session) {
  const { applicationId, agreedRate, currency } = session.metadata ?? {}
  if (!applicationId) return

  const application = await prisma.marketplaceApplication.findUnique({
    where:   { id: applicationId },
    include: {
      user:    { select: { name: true, email: true } },
      listing: { select: { title: true, brandName: true } },
    },
  })
  if (!application) return

  await prisma.marketplaceApplication.update({
    where: { id: applicationId },
    data:  {
      paymentStatus: 'paid',
      agreedRate:    agreedRate ? Number(agreedRate) : application.agreedRate,
      paidAt:        new Date(),
    },
  })

  sendDealSelectedEmail({
    creatorName:  application.user.name,
    creatorEmail: application.user.email,
    brandName:    application.listing.brandName,
    listingTitle: application.listing.title,
    agreedRate:   Number(agreedRate ?? application.agreedRate ?? 0),
    currency:     currency ?? 'USD',
    listingId:    application.listingId,
  }).catch(err => console.error('[webhook] deal email failed:', err))
}

async function processEvent(event: Stripe.Event, stripe: Stripe) {
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription, stripe)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        const subId   = invoice.subscription as string
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId, { expand: ['items.data'] })
          await handleSubscriptionUpsert(sub, stripe)
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const userId  = invoice.subscription_details?.metadata?.userId ?? invoice.metadata?.userId
        if (userId) await prisma.user.update({ where: { id: userId }, data: { planStatus: 'past_due' } })
        break
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.metadata?.type === 'marketplace') {
          await handleMarketplacePayment(session)
        }
        break
      }
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const stripeKey     = await getStripeSecretKey()
    const webhookSecret = await getStripeWebhookSecret()

    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
    }
    if (!webhookSecret) {
      console.error('[webhook] stripe_webhook_secret no configurado — rechazando el evento (no se procesa sin verificar la firma)')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' })
    const body   = await req.text()
    const sig    = req.headers.get('stripe-signature')

    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: any) {
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    await processEvent(event, stripe)
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[stripe webhook POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
