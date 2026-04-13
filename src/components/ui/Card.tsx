import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  gradient?: boolean
  onClick?: () => void
}

export default function Card({ children, className, hover, gradient, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-[#1e1e35] bg-[#13131f] p-5',
        hover && 'hover:border-[#2a2a4a] hover:bg-[#16162a] transition-all duration-200 cursor-pointer',
        gradient && 'bg-gradient-to-br from-[#13131f] to-[#0f0f1a]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-sm font-semibold text-gray-400 uppercase tracking-wider', className)}>
      {children}
    </h3>
  )
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('', className)}>{children}</div>
}
