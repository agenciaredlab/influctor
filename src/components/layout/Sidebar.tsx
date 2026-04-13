'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Target,
  Megaphone,
  BarChart3,
  Sparkles,
  Settings,
  Zap,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/goals', label: 'Metas & Objetivos', icon: Target },
  { href: '/campaigns', label: 'Campañas', icon: Megaphone },
  { href: '/analytics', label: 'Analytics & Ingresos', icon: BarChart3 },
  { href: '/ai-studio', label: 'AI Studio', icon: Sparkles, badge: 'IA' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#09090f] border-r border-[#1a1a2e] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1a1a2e]">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50 group-hover:shadow-violet-900/70 transition-shadow">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">influctor</span>
            <div className="text-[10px] text-violet-400 font-medium -mt-0.5">Social Growth Platform</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="mb-3 px-2">
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Principal</span>
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
              )}
            >
              <Icon
                size={18}
                className={cn(
                  'flex-shrink-0 transition-colors',
                  isActive ? 'text-violet-400' : 'text-gray-600 group-hover:text-gray-400'
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-600/30 text-violet-300 border border-violet-500/30">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={14} className="text-violet-400/50" />}
            </Link>
          )
        })}

        <div className="mt-6 mb-3 px-2">
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Configuración</span>
        </div>

        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all"
        >
          <Settings size={18} className="text-gray-600" />
          Configuración
        </Link>
      </nav>

      {/* User / Bottom section */}
      <div className="px-3 py-4 border-t border-[#1a1a2e]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-200 truncate">Alex Creator</div>
            <div className="text-xs text-gray-500 truncate">demo@influctor.app</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Online" />
        </div>
      </div>
    </aside>
  )
}
