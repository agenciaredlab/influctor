import { describe, it, expect } from 'vitest'
import { getPlan, canUseFeature, getRemainingAI, PLANS } from '../plans'

describe('getPlan', () => {
  it('returns the correct plan for each valid id', () => {
    expect(getPlan('free').id).toBe('free')
    expect(getPlan('creator').id).toBe('creator')
    expect(getPlan('pro').id).toBe('pro')
  })

  it('falls back to free for unknown plan ids', () => {
    expect(getPlan('enterprise').id).toBe('free')
    expect(getPlan('').id).toBe('free')
    expect(getPlan('admin').id).toBe('free')
  })

  it('free plan has correct limits', () => {
    const plan = getPlan('free')
    expect(plan.limits.aiGenerationsPerMonth).toBe(5)
    expect(plan.limits.socialAccounts).toBe(1)
    expect(plan.limits.canPublish).toBe(false)
    expect(plan.limits.canAccessReports).toBe(false)
    expect(plan.limits.canAccessInfluencerDiscovery).toBe(false)
  })

  it('creator plan has correct limits', () => {
    const plan = getPlan('creator')
    expect(plan.limits.aiGenerationsPerMonth).toBe(200)
    expect(plan.limits.socialAccounts).toBe(3)
    expect(plan.limits.canPublish).toBe(true)
    expect(plan.limits.canAccessReports).toBe(true)
    expect(plan.limits.canAccessInfluencerDiscovery).toBe(false)
    expect(plan.limits.brandDeals).toBe(Infinity)
  })

  it('pro plan has unlimited AI and full access', () => {
    const plan = getPlan('pro')
    expect(plan.limits.aiGenerationsPerMonth).toBe(Infinity)
    expect(plan.limits.socialAccounts).toBe(Infinity)
    expect(plan.limits.canPublish).toBe(true)
    expect(plan.limits.canAccessInfluencerDiscovery).toBe(true)
  })

  it('plan prices are correct', () => {
    expect(getPlan('free').price).toBe(0)
    expect(getPlan('creator').price).toBe(19)
    expect(getPlan('pro').price).toBe(49)
  })
})

describe('canUseFeature', () => {
  it('returns false for boolean false features on free', () => {
    expect(canUseFeature('free', 'canPublish')).toBe(false)
    expect(canUseFeature('free', 'canAccessReports')).toBe(false)
    expect(canUseFeature('free', 'canAccessContracts')).toBe(false)
    expect(canUseFeature('free', 'canAccessInfluencerDiscovery')).toBe(false)
  })

  it('returns true for boolean true features on creator', () => {
    expect(canUseFeature('creator', 'canPublish')).toBe(true)
    expect(canUseFeature('creator', 'canAccessReports')).toBe(true)
    expect(canUseFeature('creator', 'canAccessContracts')).toBe(true)
  })

  it('returns true for all boolean features on pro', () => {
    expect(canUseFeature('pro', 'canPublish')).toBe(true)
    expect(canUseFeature('pro', 'canAccessInfluencerDiscovery')).toBe(true)
  })

  it('returns true for numeric limits (not the gating mechanism)', () => {
    expect(canUseFeature('free', 'aiGenerationsPerMonth')).toBe(true)
    expect(canUseFeature('free', 'socialAccounts')).toBe(true)
  })

  it('falls back to free for unknown plan', () => {
    expect(canUseFeature('superplan', 'canPublish')).toBe(false)
  })
})

describe('getRemainingAI', () => {
  it('calculates remaining correctly', () => {
    expect(getRemainingAI('free', 0)).toBe(5)
    expect(getRemainingAI('free', 3)).toBe(2)
    expect(getRemainingAI('free', 5)).toBe(0)
    expect(getRemainingAI('creator', 50)).toBe(150)
  })

  it('clamps at 0 when over limit', () => {
    expect(getRemainingAI('free', 10)).toBe(0)
    expect(getRemainingAI('creator', 999)).toBe(0)
  })

  it('returns Infinity for pro', () => {
    expect(getRemainingAI('pro', 9999)).toBe(Infinity)
  })

  it('treats unknown plan as free', () => {
    expect(getRemainingAI('unknown', 0)).toBe(5)
  })
})

describe('PLANS constant', () => {
  it('all plans have required fields', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan).toHaveProperty('id')
      expect(plan).toHaveProperty('name')
      expect(plan).toHaveProperty('price')
      expect(plan).toHaveProperty('limits')
      expect(plan).toHaveProperty('features')
    }
  })

  it('plan ids match their keys', () => {
    expect(PLANS.free.id).toBe('free')
    expect(PLANS.creator.id).toBe('creator')
    expect(PLANS.pro.id).toBe('pro')
  })
})
