import { describe, it, expect, vi } from 'vitest'

vi.mock('resend', () => ({
  Resend: function MockResend() {
    return { emails: { send: vi.fn().mockResolvedValue({ id: 'mock-id' }) } }
  },
}))

import {
  buildDealStageHtml,
  buildGoalAchievedHtml,
  buildAiLimitWarningHtml,
  buildPublishFailedHtml,
} from '../email'

// ─── Deal stage notification ─────────────────────────────────────────────────

describe('buildDealStageHtml', () => {
  const base = {
    userName: 'Ana',
    userEmail: 'ana@example.com',
    brand: 'Nike',
    oldStage: 'negotiation',
    newStage: 'active',
    value: 2000,
    currency: 'USD',
  }

  it('includes brand name', () => {
    expect(buildDealStageHtml(base)).toContain('Nike')
  })

  it('includes old and new stage labels in Spanish', () => {
    const html = buildDealStageHtml(base)
    expect(html).toContain('Negociación')
    expect(html).toContain('Activo')
  })

  it('includes deal value', () => {
    expect(buildDealStageHtml(base)).toContain('2')
    expect(buildDealStageHtml(base)).toContain('USD')
  })

  it('includes user name', () => {
    expect(buildDealStageHtml(base)).toContain('Ana')
  })

  it('uses celebration emoji for completed stage', () => {
    const html = buildDealStageHtml({ ...base, newStage: 'completed' })
    expect(html).toContain('🎉')
  })

  it('uses sad emoji for declined stage', () => {
    const html = buildDealStageHtml({ ...base, newStage: 'declined' })
    expect(html).toContain('😔')
  })

  it('includes link to /deals', () => {
    expect(buildDealStageHtml(base)).toContain('/deals')
  })

  it('applies new stage color in border style', () => {
    const html = buildDealStageHtml({ ...base, newStage: 'completed' })
    // completed = #10b981
    expect(html).toContain('#10b981')
  })

  it('handles unknown stages without crashing', () => {
    const html = buildDealStageHtml({ ...base, oldStage: 'custom', newStage: 'custom2' })
    expect(html).toContain('Nike')
    expect(html).toContain('custom')
    expect(html).toContain('custom2')
  })
})

// ─── Goal achieved notification ───────────────────────────────────────────────

describe('buildGoalAchievedHtml', () => {
  const base = {
    userName: 'Carlos',
    userEmail: 'carlos@example.com',
    goalTitle: 'Llegar a 10K seguidores',
    targetValue: 10000,
    unit: 'seguidores',
    category: 'followers',
  }

  it('includes goal title', () => {
    expect(buildGoalAchievedHtml(base)).toContain('Llegar a 10K seguidores')
  })

  it('includes target value and unit', () => {
    const html = buildGoalAchievedHtml(base)
    expect(html).toContain('10')
    expect(html).toContain('seguidores')
  })

  it('includes user name', () => {
    expect(buildGoalAchievedHtml(base)).toContain('Carlos')
  })

  it('shows 100% completed badge', () => {
    expect(buildGoalAchievedHtml(base)).toContain('100%')
  })

  it('includes link to /goals', () => {
    expect(buildGoalAchievedHtml(base)).toContain('/goals')
  })

  it('uses green success emoji', () => {
    expect(buildGoalAchievedHtml(base)).toContain('🎯')
  })
})

// ─── AI limit warning ─────────────────────────────────────────────────────────

describe('buildAiLimitWarningHtml', () => {
  const base = {
    userName: 'Luis',
    userEmail: 'luis@example.com',
    used: 160,
    limit: 200,
    planName: 'Creator',
  }

  it('shows correct percentage', () => {
    // 160 / 200 = 80%
    const html = buildAiLimitWarningHtml(base)
    expect(html).toContain('80%')
  })

  it('includes used and limit counts', () => {
    const html = buildAiLimitWarningHtml(base)
    expect(html).toContain('160')
    expect(html).toContain('200')
  })

  it('includes plan name', () => {
    expect(buildAiLimitWarningHtml(base)).toContain('Creator')
  })

  it('includes user name', () => {
    expect(buildAiLimitWarningHtml(base)).toContain('Luis')
  })

  it('includes link to /pricing', () => {
    expect(buildAiLimitWarningHtml(base)).toContain('/pricing')
  })

  it('shows remaining generations count', () => {
    // 200 - 160 = 40 remaining
    expect(buildAiLimitWarningHtml(base)).toContain('40')
  })

  it('renders progress bar width as percentage', () => {
    const html = buildAiLimitWarningHtml(base)
    expect(html).toContain('width:80%')
  })

  it('calculates correctly for 90% usage', () => {
    const html = buildAiLimitWarningHtml({ ...base, used: 180, limit: 200 })
    expect(html).toContain('90%')
    expect(html).toContain('width:90%')
  })
})

// ─── Publish failed notification ─────────────────────────────────────────────

describe('buildPublishFailedHtml', () => {
  const base = {
    userName:    'María',
    userEmail:   'maria@example.com',
    postTitle:   'Nuevo reel de fitness',
    platform:    'instagram',
    scheduledAt: new Date('2025-06-15T14:00:00Z'),
    attempts:    4,
    lastError:   'The access token has expired',
  }

  it('includes post title', () => {
    expect(buildPublishFailedHtml(base)).toContain('Nuevo reel de fitness')
  })

  it('includes platform', () => {
    expect(buildPublishFailedHtml(base)).toContain('instagram')
  })

  it('includes user name', () => {
    expect(buildPublishFailedHtml(base)).toContain('María')
  })

  it('includes attempt count', () => {
    expect(buildPublishFailedHtml(base)).toContain('4')
  })

  it('includes the last error message', () => {
    expect(buildPublishFailedHtml(base)).toContain('The access token has expired')
  })

  it('includes link to /calendar', () => {
    expect(buildPublishFailedHtml(base)).toContain('/calendar')
  })

  it('uses warning styling (red gradient)', () => {
    expect(buildPublishFailedHtml(base)).toContain('#450a0a')
  })

  it('escapes no HTML in error message (plain text only)', () => {
    const html = buildPublishFailedHtml({ ...base, lastError: 'API rate limit: 100 req/s' })
    expect(html).toContain('API rate limit: 100 req/s')
  })
})
