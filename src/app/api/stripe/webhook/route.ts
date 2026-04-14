import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

function mapStatus(status: Stripe.Subscription.Status): string {
  const map: Record<string, string> = {
    active: 'active', trialing: 'trialing', past_due: 'past_due',
    canceled: 'canceled', incomplete: 'incomplete',
    incomplete_expired: 'canceled', unpaid: 'past_due', paused: 'canceled',
  }
  return map[status] ?? 'active'
}

function getPlanFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_CREATOR) return 'creator'
  return 'free'
}

// In Stripe API >=2025-09-30, current_period_start/end moved to SubscriptionItem
function getSubscriptionPeriod(subscription: Stripe.Subscription): { start: number; end: number } {
  const item = subscription.items?.data?.[0] as any
  // Try item-level first (new API), fall back to subscription-level (old API)
  return {
    start: item?.current_period_start ?? (subscription as any).current_period_start ?? Math.floor(Date.now() / 1000),
    end: item?.current_period_end ?? (subscription as any).current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400,
  }
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  const priceId = subscription.items.data[0]?.price.id ?? ''
  const plan = getPlanFromPriceId(priceId)
  const status = mapStatus(subscription.status)
  const isActive = ['active', 'trialing'].includes(status)
  const { start, end } = getSubscriptionPeriod(subscription)

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      update: {
        status, plan, stripePriceId: priceId,
        currentPeriodStart: new Date(start * 1000),
        currentPeriodEnd: new Date(end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        updatedAt: new Date(),
      },
      create: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: priceId, plan, status,
        currentPeriodStart: new Date(start * 1000),
        currentPeriodEnd: new Date(end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        userId,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        plan: isActive ? plan : 'free',
        planStatus: status,
        planCurrentPeriodEnd: new Date(end * 1000),
      },
    }),
  ])
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: 'canceled', canceledAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { plan: 'free', planStatus: 'canceled' },
    }),
  ])
}

async function processEvent(event: Stripe.Event) {
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        const subId = invoice.subscription as string
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId, {
            expand: ['items.data'],
          })
          await handleSubscriptionUpsert(sub)
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const userId = invoice.subscription_details?.metadata?.userId
          ?? invoice.metadata?.userId
        if (userId) {
          await prisma.user.update({ where: { id: userId }, data: { planStatus: 'past_due' } })
        }
        break
      }
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err)
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('No webhook secret — skipping signature verification (dev mode)')
    try { await processEvent(JSON.parse(body)) } catch {}
    return NextResponse.json({ received: true })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  await processEvent(event)
  return NextResponse.json({ received: true })
}
