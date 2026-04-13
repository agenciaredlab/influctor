import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function getProgressColor(progress: number): string {
  if (progress >= 80) return 'bg-emerald-500'
  if (progress >= 50) return 'bg-violet-500'
  if (progress >= 25) return 'bg-amber-500'
  return 'bg-red-500'
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    instagram: 'from-purple-600 to-pink-600',
    tiktok: 'from-gray-900 to-gray-700',
    youtube: 'from-red-600 to-red-700',
    twitter: 'from-sky-500 to-sky-600',
    linkedin: 'from-blue-700 to-blue-800',
    all: 'from-violet-600 to-indigo-600',
    multi: 'from-violet-600 to-indigo-600',
  }
  return colors[platform] || 'from-gray-600 to-gray-700'
}

export function getPlatformBg(platform: string): string {
  const colors: Record<string, string> = {
    instagram: 'bg-gradient-to-r from-purple-600 to-pink-600',
    tiktok: 'bg-gray-900',
    youtube: 'bg-red-600',
    twitter: 'bg-sky-500',
    linkedin: 'bg-blue-700',
    all: 'bg-gradient-to-r from-violet-600 to-indigo-600',
    multi: 'bg-gradient-to-r from-violet-600 to-indigo-600',
  }
  return colors[platform] || 'bg-gray-600'
}

export function getPlatformEmoji(platform: string): string {
  const emojis: Record<string, string> = {
    instagram: '📸',
    tiktok: '🎵',
    youtube: '▶️',
    twitter: '🐦',
    linkedin: '💼',
    all: '🌐',
    multi: '🌐',
  }
  return emojis[platform] || '📱'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    completed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    paused: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    draft: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
    failed: 'text-red-400 bg-red-400/10 border-red-400/20',
    cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
  }
  return colors[status] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Activo',
    completed: 'Completado',
    paused: 'Pausado',
    draft: 'Borrador',
    failed: 'Fallido',
    cancelled: 'Cancelado',
  }
  return labels[status] || status
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: 'text-red-400 bg-red-400/10',
    medium: 'text-amber-400 bg-amber-400/10',
    low: 'text-green-400 bg-green-400/10',
  }
  return colors[priority] || 'text-gray-400 bg-gray-400/10'
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
  }
  return labels[priority] || priority
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    followers: 'Seguidores',
    engagement: 'Engagement',
    income: 'Ingresos',
    content: 'Contenido',
    views: 'Vistas',
    brand_deals: 'Brand Deals',
  }
  return labels[category] || category
}

export function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    brand_deal: 'Brand Deal',
    affiliate: 'Afiliados',
    adsense: 'AdSense',
    merch: 'Merchandise',
    tips: 'Tips/Donaciones',
    subscription: 'Suscripciones',
    consulting: 'Consultoría',
    other: 'Otro',
  }
  return labels[source] || source
}

export function getObjectiveLabel(objective: string): string {
  const labels: Record<string, string> = {
    awareness: 'Awareness',
    engagement: 'Engagement',
    conversion: 'Conversión',
    growth: 'Crecimiento',
    monetization: 'Monetización',
  }
  return labels[objective] || objective
}

export function calculateROI(revenue: number, cost: number): number {
  if (cost === 0) return 0
  return ((revenue - cost) / cost) * 100
}

export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min(100, (current / target) * 100)
}
