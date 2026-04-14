export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    description: 'Para empezar a explorar',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    limits: {
      aiGenerationsPerMonth: 5,
      socialAccounts: 1,
      brandDeals: 3,
      contentPosts: 10,
      canPublish: false,
      canAccessReports: false,
      canAccessContracts: false,
      canAccessInfluencerDiscovery: false,
    },
    features: [
      '5 generaciones de IA por mes',
      '1 cuenta de red social',
      'Calendario básico (sin publicar)',
      'Viral Lab',
      '3 Brand Deals',
    ],
    notIncluded: [
      'Publicación directa a Instagram',
      'Reportes semanales',
      'Contract Builder',
      'Influencer Discovery',
      'Soporte prioritario',
    ],
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    price: 19,
    priceId: process.env.STRIPE_PRICE_CREATOR,
    description: 'Para creadores en crecimiento',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    badge: 'Más popular',
    limits: {
      aiGenerationsPerMonth: 200,
      socialAccounts: 3,
      brandDeals: Infinity,
      contentPosts: Infinity,
      canPublish: true,
      canAccessReports: true,
      canAccessContracts: true,
      canAccessInfluencerDiscovery: false,
    },
    features: [
      '200 generaciones de IA por mes',
      '3 cuentas de redes sociales',
      'Publicación directa a Instagram',
      'Calendario completo con programación',
      'Brand Deals CRM ilimitado',
      'Reportes semanales automáticos',
      'Contract Builder',
      'Outreach Kit',
      'Script Writer',
      'Hashtag Explorer',
    ],
    notIncluded: [
      'Influencer Discovery',
      'Equipo (multi-usuario)',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49,
    priceId: process.env.STRIPE_PRICE_PRO,
    description: 'Para agencias y creadores pro',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    limits: {
      aiGenerationsPerMonth: Infinity,
      socialAccounts: Infinity,
      brandDeals: Infinity,
      contentPosts: Infinity,
      canPublish: true,
      canAccessReports: true,
      canAccessContracts: true,
      canAccessInfluencerDiscovery: true,
    },
    features: [
      'IA ilimitada',
      'Cuentas ilimitadas de redes sociales',
      'Todo lo de Creator',
      'Influencer Discovery',
      'Analytics avanzados',
      'Hasta 5 miembros de equipo',
      'Soporte prioritario',
      'Reportes con marca propia',
    ],
    notIncluded: [],
  },
} as const

export type PlanId = keyof typeof PLANS

export function getPlan(planId: string) {
  return PLANS[planId as PlanId] ?? PLANS.free
}

export function canUseFeature(
  planId: string,
  feature: keyof typeof PLANS.free.limits
): boolean {
  const plan = getPlan(planId)
  const value = plan.limits[feature]
  if (typeof value === 'boolean') return value
  return true // numeric limits are checked separately
}

export function getRemainingAI(plan: string, usedThisMonth: number): number {
  const limit = getPlan(plan).limits.aiGenerationsPerMonth
  if (limit === Infinity) return Infinity
  return Math.max(0, limit - usedThisMonth)
}
