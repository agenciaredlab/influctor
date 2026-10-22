/**
 * Regression test: server pages must let the NEXT_REDIRECT thrown by
 * getSessionUser() propagate (redirect to /login for no session / inactive user /
 * deactivated team owner). If someone wraps it in a `try {} catch {}` again, the
 * redirect is swallowed and the page renders with owner defaults -> these fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSessionUser: vi.fn() }))
vi.mock('@/lib/account', () => ({ getAccountUser: vi.fn() }))

// Prisma: every query throws, so a page that swallowed the redirect would still
// "work" (catch -> defaults) instead of failing for an unrelated reason.
vi.mock('@/lib/prisma', () => {
  const cache = new Map<string, any>()
  const modelProxy = () => {
    const fns = new Map<string, any>()
    return new Proxy({}, {
      get: (_t, op: string) => {
        if (!fns.has(op)) fns.set(op, vi.fn().mockRejectedValue(new Error('db down')))
        return fns.get(op)
      },
    })
  }
  const prisma = new Proxy({}, {
    get: (_t, model: string) => {
      if (!cache.has(model)) cache.set(model, modelProxy())
      return cache.get(model)
    },
  })
  return { prisma }
})

// Heavy UI deps: replace with inert components.
vi.mock('@/components/layout/DashboardLayout', () => ({ default: () => null }))
vi.mock('@/components/ui/Card', () => ({ default: () => null }))
vi.mock('@/components/ui/UpgradeGate', () => ({ default: () => null }))
vi.mock('@/components/social/InstagramConnect', () => ({ default: () => null }))
vi.mock('@/components/social/TikTokConnect', () => ({ default: () => null }))
vi.mock('@/components/team/TeamSection', () => ({ default: () => null }))
vi.mock('lucide-react', () => ({ User: () => null, Shield: () => null, Link2: () => null }))
vi.mock('@/app/pricing/PricingClient', () => ({ default: () => null }))
vi.mock('@/app/marketplace/MarketplaceClient', () => ({ default: () => null }))
vi.mock('@/app/reports/ReportsClient', () => ({ default: () => null }))
vi.mock('@/app/competitors/CompetitorsClient', () => ({ default: () => null }))
vi.mock('@/app/influencer-discovery/InfluencerDiscoveryClient', () => ({ default: () => null }))

import { getSessionUser } from '@/lib/session'
import { getAccountUser } from '@/lib/account'
import PricingPage from '@/app/pricing/page'
import SettingsPage from '@/app/settings/page'
import MarketplacePage from '@/app/marketplace/page'
import ReportsPage from '@/app/reports/page'
import CompetitorsPage from '@/app/competitors/page'
import InfluencerDiscoveryPage from '@/app/influencer-discovery/page'

const mockSession = vi.mocked(getSessionUser)
const mockAccount = vi.mocked(getAccountUser)

function nextRedirectError() {
  return Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/login;307;' })
}

// Walk a React element tree and return the props of the first element whose type is `type`.
function findPropsOf(node: any, type: unknown): any {
  if (!node || typeof node !== 'object') return undefined
  if (node.type === type) return node.props
  const children = node.props?.children
  for (const c of Array.isArray(children) ? children : [children]) {
    const found = findPropsOf(c, type)
    if (found) return found
  }
  return undefined
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('server pages propagate the getSessionUser() redirect', () => {
  it.each([
    ['/pricing', PricingPage],
    ['/settings', SettingsPage],
    ['/marketplace', MarketplacePage],
    ['/reports', ReportsPage],
    ['/competitors', CompetitorsPage],
    ['/influencer-discovery', InfluencerDiscoveryPage],
  ] as const)('%s rethrows NEXT_REDIRECT instead of rendering defaults', async (_route, Page) => {
    const err = nextRedirectError()
    mockSession.mockRejectedValue(err)

    let thrown: unknown
    try {
      await (Page as () => Promise<unknown>)()
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBe(err)
    expect((thrown as Error).message).toBe('NEXT_REDIRECT')
  })
})

describe('/pricing props handed to PricingClient', () => {
  const PERIOD_END = new Date('2026-12-01T00:00:00.000Z')

  it('team member: gets the owner plan, no subscription, no secrets at any level', async () => {
    mockSession.mockResolvedValue({
      id: 'member_1', accountId: 'owner_1', email: 'm@x.com', name: 'Member',
      plan: 'free', planStatus: 'active', aiUsageThisMonth: 0,
      password: 'member-hash', stripeCustomerId: 'cus_member',
    } as any)
    mockAccount.mockResolvedValue({
      id: 'owner_1', name: 'Ana Dueña', email: 'o@x.com',
      plan: 'pro', planStatus: 'active', aiUsageThisMonth: 42,
      password: 'owner-bcrypt-hash', stripeCustomerId: 'cus_owner', stripeSubscriptionId: 'sub_owner',
    } as any)

    const PricingClient = (await import('@/app/pricing/PricingClient')).default
    const props = findPropsOf(await PricingPage(), PricingClient)

    expect(props).toBeDefined()
    expect(mockAccount).toHaveBeenCalledWith('owner_1')
    expect(props.isTeamMember).toBe(true)
    expect(props.subscription).toBeNull()
    expect(props.currentPlan).toBe('pro')
    expect(props.planStatus).toBe('active')
    expect(props.aiUsed).toBe(42)
    expect(props.ownerName).toBe('Ana Dueña')

    const json = JSON.stringify(props)
    for (const secret of ['password', 'stripeCustomerId', 'stripeSubscriptionId', 'owner-bcrypt-hash', 'cus_owner', 'sub_owner', 'member-hash', 'cus_member']) {
      expect(json).not.toContain(secret)
    }
  })

  it('account owner: subscription is whitelisted to currentPeriodEnd/trialEnd/cancelAtPeriodEnd/status', async () => {
    mockSession.mockResolvedValue({
      id: 'owner_1', accountId: 'owner_1', email: 'o@x.com', name: 'Ana',
      plan: 'creator', planStatus: 'active', aiUsageThisMonth: 7,
    } as any)
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: 'sub_row', userId: 'owner_1',
      stripeSubscriptionId: 'sub_123', stripeCustomerId: 'cus_123', stripePriceId: 'price_123',
      currentPeriodEnd: PERIOD_END, trialEnd: null, cancelAtPeriodEnd: true, status: 'active',
    } as any)

    const PricingClient = (await import('@/app/pricing/PricingClient')).default
    const props = findPropsOf(await PricingPage(), PricingClient)

    expect(props.isTeamMember).toBe(false)
    expect(props.currentPlan).toBe('creator')
    expect(props.aiUsed).toBe(7)
    expect(props.ownerName).toBeNull()
    expect(Object.keys(props.subscription).sort()).toEqual(
      ['cancelAtPeriodEnd', 'currentPeriodEnd', 'status', 'trialEnd'],
    )
    expect(props.subscription).toEqual({
      currentPeriodEnd: PERIOD_END.toISOString(),
      trialEnd: null,
      cancelAtPeriodEnd: true,
      status: 'active',
    })
    const json = JSON.stringify(props)
    for (const secret of ['stripeSubscriptionId', 'stripeCustomerId', 'stripePriceId', 'sub_123', 'cus_123', 'price_123']) {
      expect(json).not.toContain(secret)
    }
  })
})
