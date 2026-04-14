'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, X, Zap, Star, Crown, ArrowRight, RefreshCw, ExternalLink, AlertCircle, Shield } from 'lucide-react'
import { PLANS } from '@/lib/plans'
import { cn } from '@/lib/utils'

interface Props {
  currentPlan: string
  planStatus: string
  subscription: {
    currentPeriodEnd: string
    trialEnd: string | null
    cancelAtPeriodEnd: boolean
    status: string
  } | null
  aiUsed: number
}

const PLAN_ICONS = { free: Zap, creator: Star, pro: Crown }

export default function PricingClient({ currentPlan, planStatus, subscription, aiUsed }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      const plan = searchParams.get('plan')
      setSuccessMsg(`¡Bienvenido al plan ${plan?.charAt(0).toUpperCase()}${plan?.slice(1)}! Tu suscripción está activa.`)
    }
    if (searchParams.get('canceled') === '1') {
      setError('El proceso de pago fue cancelado.')
      setTimeout(() => setError(''), 4000)
    }
  }, [searchParams])

  async function subscribe(planId: string) {
    setLoading(planId)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (e: any) {
      setError(e.message)
      setLoading(null)
    }
  }

  async function openPortal() {
    setLoading('portal')
    setError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (e: any) {
      setError(e.message)
      setLoading(null)
    }
  }

  const isTrialing = subscription?.status === 'trialing'
  const trialEnd = subscription?.trialEnd ? new Date(subscription.trialEnd) : null
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
  const daysLeft = periodEnd ? Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 3600 * 24)) : null

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Success / Error banners */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-400">{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Current plan status */}
      {currentPlan !== 'free' && subscription && (
        <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/20 border border-violet-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
                <Crown size={18} className="text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Plan {PLANS[currentPlan as keyof typeof PLANS]?.name}</span>
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-medium',
                    isTrialing ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    planStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  )}>
                    {isTrialing ? `Prueba gratuita · ${trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 3600 * 24)) : 0}d` : planStatus}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancela el ${periodEnd?.toLocaleDateString('es-ES')}`
                    : daysLeft !== null
                      ? `Próxima renovación en ${daysLeft} días`
                      : 'Activo'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={openPortal}
              disabled={loading === 'portal'}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-colors disabled:opacity-50"
            >
              {loading === 'portal' ? <RefreshCw size={13} className="animate-spin" /> : <ExternalLink size={13} />}
              Gestionar suscripción
            </button>
          </div>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(PLANS).map(plan => {
          const Icon = PLAN_ICONS[plan.id as keyof typeof PLAN_ICONS]
          const isCurrent = currentPlan === plan.id
          const isPopular = 'badge' in plan

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-2xl border p-6 flex flex-col',
                isCurrent
                  ? 'bg-violet-900/20 border-violet-500/40 shadow-lg shadow-violet-900/20'
                  : isPopular
                    ? 'bg-[#13131f] border-violet-500/30'
                    : 'bg-[#13131f] border-[#1a1a2e]'
              )}
            >
              {isPopular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    {'badge' in plan ? (plan as any).badge : ''}
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    Tu plan actual
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="mb-6">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', plan.bg)}>
                  <Icon size={18} className={plan.color} />
                </div>
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-black text-white">${plan.price}</span>
                  {plan.price > 0 && <span className="text-gray-500 text-sm mb-1">/mes</span>}
                  {plan.price === 0 && <span className="text-gray-500 text-sm mb-1">gratis</span>}
                </div>
                {plan.price > 0 && (
                  <p className="text-[10px] text-gray-600 mt-1">7 días de prueba gratis · Sin tarjeta hasta después</p>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2 flex-1 mb-6">
                {plan.features.map(feature => (
                  <div key={feature} className="flex items-start gap-2 text-xs">
                    <CheckCircle size={12} className={cn('mt-0.5 flex-shrink-0', plan.color)} />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
                {'notIncluded' in plan && (plan as any).notIncluded.map((feature: string) => (
                  <div key={feature} className="flex items-start gap-2 text-xs">
                    <X size={12} className="mt-0.5 flex-shrink-0 text-gray-700" />
                    <span className="text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {isCurrent ? (
                <div className="py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium text-center">
                  Plan activo
                </div>
              ) : plan.id === 'free' ? (
                <div className="py-2.5 rounded-xl border border-[#1a1a2e] text-gray-500 text-sm text-center">
                  Plan gratuito
                </div>
              ) : (
                <button
                  onClick={() => subscribe(plan.id)}
                  disabled={!!loading}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50',
                    isPopular
                      ? 'bg-violet-600 hover:bg-violet-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  )}
                >
                  {loading === plan.id
                    ? <><RefreshCw size={13} className="animate-spin" /> Cargando...</>
                    : <>Empezar prueba gratis <ArrowRight size={13} /></>
                  }
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* AI usage meter (for current plan) */}
      {currentPlan !== 'free' || aiUsed > 0 ? (
        <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap size={14} className="text-violet-400" /> Uso de IA este mes
            </h3>
            <span className="text-xs text-gray-400">
              {aiUsed} / {PLANS[currentPlan as keyof typeof PLANS]?.limits.aiGenerationsPerMonth === Infinity ? '∞' : PLANS[currentPlan as keyof typeof PLANS]?.limits.aiGenerationsPerMonth}
            </span>
          </div>
          {PLANS[currentPlan as keyof typeof PLANS]?.limits.aiGenerationsPerMonth !== Infinity && (
            <>
              <div className="h-2 bg-[#0d0d1a] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', aiUsed >= (PLANS[currentPlan as keyof typeof PLANS]?.limits.aiGenerationsPerMonth as number) * 0.9 ? 'bg-red-500' : 'bg-violet-500')}
                  style={{ width: `${Math.min(100, (aiUsed / (PLANS[currentPlan as keyof typeof PLANS]?.limits.aiGenerationsPerMonth as number)) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-1.5">Se reinicia el 1 de cada mes</p>
            </>
          )}
        </div>
      ) : null}

      {/* Trust signals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Shield, title: 'Pagos seguros', desc: 'Procesado por Stripe. Nunca almacenamos datos de tu tarjeta.' },
          { icon: RefreshCw, title: 'Cancela cuando quieras', desc: 'Sin contratos ni permanencias. Cancela con un clic.' },
          { icon: Star, title: '7 días de prueba gratis', desc: 'Prueba Creator o Pro sin riesgo. No se cobra hasta después.' },
        ].map(item => (
          <div key={item.title} className="flex items-start gap-3 p-4 bg-[#13131f] border border-[#1a1a2e] rounded-xl">
            <item.icon size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
