'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  showTagline?: boolean
  className?: string
}

const SIZES = {
  sm: { box: 'w-7 h-7', icon: 13, text: 'text-sm', tagline: 'text-[9px]', img: 'h-12' },
  md: { box: 'w-8 h-8', icon: 16, text: 'text-lg', tagline: 'text-[10px]', img: 'h-16' },
  lg: { box: 'w-9 h-9', icon: 16, text: 'text-xl', tagline: 'text-[10px]', img: 'h-24' },
} as const

/**
 * Renders the configured branding logo (from /admin/settings -> Marca) if set,
 * otherwise falls back to the default gradient-icon + "influctor" wordmark.
 */
export default function Logo({ size = 'sm', href, showTagline = true, className }: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/branding')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled) setLogoUrl(data?.logoUrl ?? null) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const s = SIZES[size]

  // While we don't yet know if a custom logo is configured, render an
  // invisible placeholder instead of the fallback icon — avoids a visible
  // flash where the fallback briefly shows before the real logo swaps in.
  const content = loading ? (
    <div className={cn(s.img, 'invisible')}>influctor</div>
  ) : logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="Logo" className={cn(s.img, 'w-auto object-contain')} />
  ) : (
    <div className="flex items-center gap-2.5">
      <div className={cn(s.box, 'rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50 flex-shrink-0')}>
        <Zap size={s.icon} className="text-white" />
      </div>
      <div>
        <span className={cn(s.text, 'font-bold text-white tracking-tight')}>influctor</span>
        {showTagline && <div className={cn(s.tagline, 'text-violet-400 -mt-0.5')}>Social Growth Platform</div>}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className={cn('flex items-center gap-2.5 group', className)}>
        {content}
      </Link>
    )
  }
  return <div className={className}>{content}</div>
}
