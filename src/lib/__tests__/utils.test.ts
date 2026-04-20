import { describe, it, expect } from 'vitest'
import {
  formatCurrency, formatNumber, formatPercent,
  getProgressColor, getPlatformColor, getPlatformBg, getPlatformEmoji,
  getStatusColor, getStatusLabel,
  getPriorityColor, getPriorityLabel,
  getCategoryLabel, getSourceLabel, getObjectiveLabel,
  calculateROI, calculateProgress,
} from '../utils'

describe('formatCurrency', () => {
  it('formats whole numbers', () => {
    expect(formatCurrency(1000)).toContain('1')
    expect(formatCurrency(0)).toContain('0')
  })
  it('uses USD by default', () => {
    expect(formatCurrency(500)).toContain('$')
  })
  it('formats large amounts', () => {
    const result = formatCurrency(10000)
    expect(result).toContain('10')
  })
})

describe('formatNumber', () => {
  it('returns plain string for < 1K', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
  })
  it('formats thousands with K', () => {
    expect(formatNumber(1000)).toBe('1.0K')
    expect(formatNumber(15500)).toBe('15.5K')
    expect(formatNumber(999999)).toBe('1000.0K')
  })
  it('formats millions with M', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M')
    expect(formatNumber(2_500_000)).toBe('2.5M')
  })
})

describe('formatPercent', () => {
  it('formats with 1 decimal by default', () => {
    expect(formatPercent(4.5)).toBe('4.5%')
    expect(formatPercent(100)).toBe('100.0%')
  })
  it('respects custom decimals', () => {
    expect(formatPercent(3.14159, 2)).toBe('3.14%')
    expect(formatPercent(50, 0)).toBe('50%')
  })
})

describe('getProgressColor', () => {
  it('returns emerald for >= 80', () => {
    expect(getProgressColor(80)).toBe('bg-emerald-500')
    expect(getProgressColor(100)).toBe('bg-emerald-500')
  })
  it('returns violet for 50–79', () => {
    expect(getProgressColor(50)).toBe('bg-violet-500')
    expect(getProgressColor(79)).toBe('bg-violet-500')
  })
  it('returns amber for 25–49', () => {
    expect(getProgressColor(25)).toBe('bg-amber-500')
    expect(getProgressColor(49)).toBe('bg-amber-500')
  })
  it('returns red for < 25', () => {
    expect(getProgressColor(0)).toBe('bg-red-500')
    expect(getProgressColor(24)).toBe('bg-red-500')
  })
})

describe('getPlatformColor', () => {
  it('returns known platforms', () => {
    expect(getPlatformColor('instagram')).toContain('purple')
    expect(getPlatformColor('youtube')).toContain('red')
    expect(getPlatformColor('tiktok')).toContain('gray')
    expect(getPlatformColor('linkedin')).toContain('blue')
    expect(getPlatformColor('twitter')).toContain('sky')
  })
  it('returns fallback for unknown', () => {
    expect(getPlatformColor('unknown')).toContain('gray')
    expect(getPlatformColor('')).toContain('gray')
  })
})

describe('getPlatformBg', () => {
  it('returns background classes for known platforms', () => {
    expect(getPlatformBg('instagram')).toContain('gradient')
    expect(getPlatformBg('youtube')).toContain('red')
  })
  it('falls back gracefully', () => {
    expect(getPlatformBg('foobar')).toBe('bg-gray-600')
  })
})

describe('getPlatformEmoji', () => {
  it('returns correct emojis', () => {
    expect(getPlatformEmoji('instagram')).toBe('📸')
    expect(getPlatformEmoji('tiktok')).toBe('🎵')
    expect(getPlatformEmoji('youtube')).toBe('▶️')
    expect(getPlatformEmoji('twitter')).toBe('🐦')
    expect(getPlatformEmoji('linkedin')).toBe('💼')
  })
  it('returns 📱 for unknown', () => {
    expect(getPlatformEmoji('snapchat')).toBe('📱')
  })
})

describe('getStatusColor', () => {
  it('returns classes for known statuses', () => {
    expect(getStatusColor('active')).toContain('emerald')
    expect(getStatusColor('completed')).toContain('blue')
    expect(getStatusColor('paused')).toContain('amber')
    expect(getStatusColor('draft')).toContain('gray')
    expect(getStatusColor('failed')).toContain('red')
    expect(getStatusColor('cancelled')).toContain('red')
  })
  it('falls back to gray for unknown', () => {
    expect(getStatusColor('other')).toContain('gray')
  })
})

describe('getStatusLabel', () => {
  it('returns Spanish labels', () => {
    expect(getStatusLabel('active')).toBe('Activo')
    expect(getStatusLabel('completed')).toBe('Completado')
    expect(getStatusLabel('paused')).toBe('Pausado')
    expect(getStatusLabel('draft')).toBe('Borrador')
  })
  it('returns raw value for unknown', () => {
    expect(getStatusLabel('custom')).toBe('custom')
  })
})

describe('getPriorityColor', () => {
  it('returns correct colors', () => {
    expect(getPriorityColor('high')).toContain('red')
    expect(getPriorityColor('medium')).toContain('amber')
    expect(getPriorityColor('low')).toContain('green')
  })
  it('falls back for unknown', () => {
    expect(getPriorityColor('critical')).toContain('gray')
  })
})

describe('getPriorityLabel', () => {
  it('returns Spanish labels', () => {
    expect(getPriorityLabel('high')).toBe('Alta')
    expect(getPriorityLabel('medium')).toBe('Media')
    expect(getPriorityLabel('low')).toBe('Baja')
  })
  it('returns raw value for unknown', () => {
    expect(getPriorityLabel('unknown')).toBe('unknown')
  })
})

describe('getCategoryLabel', () => {
  it('returns Spanish labels for all categories', () => {
    expect(getCategoryLabel('followers')).toBe('Seguidores')
    expect(getCategoryLabel('engagement')).toBe('Engagement')
    expect(getCategoryLabel('income')).toBe('Ingresos')
    expect(getCategoryLabel('content')).toBe('Contenido')
    expect(getCategoryLabel('views')).toBe('Vistas')
    expect(getCategoryLabel('brand_deals')).toBe('Brand Deals')
  })
})

describe('getSourceLabel', () => {
  it('returns labels for all income sources', () => {
    expect(getSourceLabel('brand_deal')).toBe('Brand Deal')
    expect(getSourceLabel('affiliate')).toBe('Afiliados')
    expect(getSourceLabel('adsense')).toBe('AdSense')
    expect(getSourceLabel('merch')).toBe('Merchandise')
    expect(getSourceLabel('tips')).toBe('Tips/Donaciones')
    expect(getSourceLabel('subscription')).toBe('Suscripciones')
    expect(getSourceLabel('consulting')).toBe('Consultoría')
    expect(getSourceLabel('other')).toBe('Otro')
  })
})

describe('getObjectiveLabel', () => {
  it('returns labels for all objectives', () => {
    expect(getObjectiveLabel('awareness')).toBe('Awareness')
    expect(getObjectiveLabel('engagement')).toBe('Engagement')
    expect(getObjectiveLabel('conversion')).toBe('Conversión')
    expect(getObjectiveLabel('growth')).toBe('Crecimiento')
    expect(getObjectiveLabel('monetization')).toBe('Monetización')
  })
})

describe('calculateROI', () => {
  it('calculates correctly', () => {
    expect(calculateROI(1500, 1000)).toBeCloseTo(50)
    expect(calculateROI(500, 1000)).toBeCloseTo(-50)
    expect(calculateROI(1000, 1000)).toBe(0)
  })
  it('returns 0 when cost is 0', () => {
    expect(calculateROI(1000, 0)).toBe(0)
  })
})

describe('calculateProgress', () => {
  it('calculates percentage', () => {
    expect(calculateProgress(50, 100)).toBe(50)
    expect(calculateProgress(0, 100)).toBe(0)
    expect(calculateProgress(100, 100)).toBe(100)
  })
  it('caps at 100', () => {
    expect(calculateProgress(150, 100)).toBe(100)
    expect(calculateProgress(999, 100)).toBe(100)
  })
  it('returns 0 when target is 0', () => {
    expect(calculateProgress(50, 0)).toBe(0)
  })
})
