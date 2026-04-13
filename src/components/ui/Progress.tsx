import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  barClassName?: string
  showLabel?: boolean
  size?: 'xs' | 'sm' | 'md'
  color?: 'violet' | 'emerald' | 'amber' | 'red' | 'blue' | 'auto'
}

export default function Progress({
  value,
  max = 100,
  className,
  barClassName,
  showLabel,
  size = 'sm',
  color = 'auto',
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const getAutoColor = () => {
    if (percentage >= 80) return 'from-emerald-500 to-emerald-400'
    if (percentage >= 50) return 'from-violet-500 to-purple-400'
    if (percentage >= 25) return 'from-amber-500 to-amber-400'
    return 'from-red-500 to-red-400'
  }

  const colors = {
    violet: 'from-violet-600 to-purple-500',
    emerald: 'from-emerald-600 to-emerald-400',
    amber: 'from-amber-600 to-amber-400',
    red: 'from-red-600 to-red-400',
    blue: 'from-blue-600 to-blue-400',
    auto: getAutoColor(),
  }

  const heights = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex-1 bg-[#1e1e35] rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out',
            colors[color],
            barClassName
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-400 tabular-nums min-w-[2.5rem] text-right">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}
