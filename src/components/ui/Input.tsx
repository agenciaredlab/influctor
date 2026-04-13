import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2.5 text-sm text-white placeholder-gray-600',
              'focus:border-violet-500/50 focus:bg-[#13131f] focus:outline-none focus:ring-1 focus:ring-violet-500/30',
              'transition-all duration-200',
              icon && 'pl-9',
              error && 'border-red-500/50 focus:border-red-500/70',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-300">{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none',
            'focus:border-violet-500/50 focus:bg-[#13131f] focus:outline-none focus:ring-1 focus:ring-violet-500/30',
            'transition-all duration-200',
            error && 'border-red-500/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-gray-300">{label}</label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2.5 text-sm text-white',
            'focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30',
            'transition-all duration-200',
            error && 'border-red-500/50',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0f0f1a]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
