'use client'

import Link from 'next/link'
import { Lock, Zap, Star, Crown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLANS, type PlanId } from '@/lib/plans'

const PLAN_ICONS: Record<string, any> = { free: Zap, creator: Star, pro: Crown }
const PLAN_LABELS: Record<string, string> = { creator: 'Creator', pro: 'Pro' }
const PLAN_COLORS: Record<string, { text: string; bg: string; border: string; btn: string }> = {
  creator: {
    text: 'text-violet-300',
    bg: 'from-violet-900/40 to-purple-900/20',
    border: 'border-violet-500/30',
    btn: 'bg-violet-600 hover:bg-violet-500',
  },
  pro: {
    text: 'text-amber-300',
    bg: 'from-amber-900/30 to-orange-900/20',
    border: 'border-amber-500/30',
    btn: 'bg-amber-600 hover:bg-amber-500',
  },
}

interface UpgradeGateProps {
  /** Current user plan */
  plan: string
  /** Minimum plan required to access this feature */
  requiredPlan: 'creator' | 'pro'
  /** Feature name shown in the gate */
  feature: string
  /** Short description of what the user unlocks */
  description?: string
  /** Gate style: 'overlay' blurs content behind, 'banner' shows inline, 'block' replaces content */
  variant?: 'overlay' | 'banner' | 'block'
  /** Children shown behind the gate (for overlay mode) */
  children?: React.ReactNode
  className?: string
}

const PLAN_ORDER = ['free', 'creator', 'pro']

function hasPlan(userPlan: string, requiredPlan: string): boolean {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(requiredPlan)
}

export default function UpgradeGate({
  plan,
  requiredPlan,
  feature,
  description,
  variant = 'block',
  children,
  className,
}: UpgradeGateProps) {
  if (hasPlan(plan, requiredPlan)) {
    return <>{children}</>
  }

  const colors = PLAN_COLORS[requiredPlan]
  const Icon = PLAN_ICONS[requiredPlan]
  const label = PLAN_LABELS[requiredPlan]
  const planData = PLANS[requiredPlan as PlanId]

  if (variant === 'banner') {
    return (
      <div className={cn('rounded-xl border p-4 bg-gradient-to-r', colors.bg, colors.border, className)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg bg-black/20')}>
              <Lock size={14} className={colors.text} />
            </div>
            <div>
              <p className={cn('text-sm font-semibold', colors.text)}>{feature}</p>
              {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
            </div>
          </div>
          <Link
            href="/pricing"
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors whitespace-nowrap', colors.btn)}
          >
            <Icon size={12} /> Plan {label} <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    )
  }

  if (variant === 'overlay') {
    return (
      <div className={cn('relative', className)}>
        {/* Blurred content */}
        <div className="pointer-events-none select-none blur-sm opacity-40">
          {children}
        </div>
        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-[#09090f]/60 backdrop-blur-[2px] rounded-xl">
          <div className={cn('text-center p-6 rounded-2xl border bg-gradient-to-br max-w-xs mx-4', colors.bg, colors.border)}>
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-black/30')}>
              <Lock size={20} className={colors.text} />
            </div>
            <h3 className={cn('font-bold text-sm mb-1', colors.text)}>{feature}</h3>
            {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}
            <Link
              href="/pricing"
              className={cn('flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-colors', colors.btn)}
            >
              <Icon size={13} /> Desbloquear con {label}
            </Link>
            <p className="text-[10px] text-gray-500 mt-2">Desde ${planData.price}/mes · 7 días gratis</p>
          </div>
        </div>
      </div>
    )
  }

  // Default: 'block' — replace content entirely
  return (
    <div className={cn('rounded-2xl border bg-gradient-to-br p-8 text-center', colors.bg, colors.border, className)}>
      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-black/20')}>
        <Lock size={22} className={colors.text} />
      </div>
      <h3 className={cn('font-bold text-base mb-2', colors.text)}>{feature}</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
        {description ?? `Esta función está disponible en el plan ${label}.`}
      </p>

      {/* What's included */}
      <div className="text-left bg-black/20 rounded-xl p-4 mb-5 max-w-xs mx-auto space-y-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Incluido en {label}:</p>
        {planData.features.slice(0, 4).map(f => (
          <div key={f} className="flex items-center gap-2 text-xs text-gray-300">
            <span className={colors.text}>✓</span> {f}
          </div>
        ))}
      </div>

      <Link
        href="/pricing"
        className={cn('inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-colors', colors.btn)}
      >
        <Icon size={14} /> Empezar con {label}
        <ArrowRight size={14} />
      </Link>
      <p className="text-[10px] text-gray-500 mt-3">Desde ${planData.price}/mes · 7 días de prueba gratis · Sin tarjeta hasta después</p>
    </div>
  )
}
