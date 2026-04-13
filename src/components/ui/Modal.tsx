'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function Modal({ open, onClose, title, description, children, size = 'md', className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className={cn(
        'relative w-full rounded-2xl border border-[#1e1e35] bg-[#0f0f1a] shadow-2xl shadow-black/50 animate-slide-up',
        sizes[size],
        className
      )}>
        {/* Header */}
        {(title || description) && (
          <div className="px-6 pt-6 pb-4 border-b border-[#1e1e35]">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
                {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={cn('p-6', !title && !description && 'pt-4')}>
          {!title && !description && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg"
            >
              <X size={18} />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
