'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, iconRight, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500/50'

    const variants = {
      primary: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50',
      secondary: 'bg-[#1a1a2e] hover:bg-[#1e1e38] text-white border border-[#252540] hover:border-[#333360]',
      ghost: 'bg-transparent hover:bg-white/5 text-gray-400 hover:text-white',
      danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 hover:border-red-500/40',
      outline: 'bg-transparent border border-violet-500/40 hover:border-violet-500/70 text-violet-400 hover:text-violet-300 hover:bg-violet-500/5',
      success: 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40',
    }

    const sizes = {
      xs: 'px-2.5 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon}
        {children}
        {!loading && iconRight}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
