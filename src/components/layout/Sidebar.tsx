'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Target, Megaphone, BarChart3, Sparkles,
  Settings, Zap, ChevronRight, Flame, DollarSign, Handshake,
  CalendarDays, BookOpen, Building2, Users2, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

const creatorNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/viral-lab', label: 'Viral Lab', icon: Flame, badge: 'NUEVO', badgeColor: 'text-orange-300 bg-orange-500/20 border-orange-500/30' },
  { href: '/goals', label: 'Metas & Objetivos', icon: Target },
  { href: '/campaigns', label: 'Campañas', icon: Megaphone },
  { href: '/calendar', label: 'Calendario', icon: CalendarDays, badge: 'NUEVO', badgeColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30' },
  { href: '/analytics', label: 'Analytics & Ingresos', icon: BarChart3 },
]

const growthNav = [
  { href: '/monetization', label: 'Monetización', icon: DollarSign, badge: 'NUEVO', badgeColor: 'text-amber-300 bg-amber-500/20 border-amber-500/30' },
  { href: '/deals', label: 'Brand Deals', icon: Handshake, badge: 'NUEVO', badgeColor: 'text-pink-300 bg-pink-500/20 border-pink-500/30' },
  { href: '/playbooks', label: 'Playbooks', icon: BookOpen, badge: 'NUEVO', badgeColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30' },
  { href: '/ai-studio', label: 'AI Studio', icon: Sparkles, badge: 'IA', badgeColor: 'text-violet-300 bg-violet-500/20 border-violet-500/30' },
]

const businessNav = [
  { href: '/business', label: 'Herramientas Pro', icon: Building2, badge: 'PRO', badgeColor: 'text-blue-300 bg-blue-500/20 border-blue-500/30' },
]

interface NavItemProps {
  href: string
  label: string
  icon: any
  badge?: string
  badgeColor?: string
  isActive: boolean
}

function NavItem({ href, label, icon: Icon, badge, badgeColor, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
        isActive
          ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20'
          : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
      )}
    >
      <Icon
        size={16}
        className={cn(
          'flex-shrink-0 transition-colors',
          isActive ? 'text-violet-400' : 'text-gray-600 group-hover:text-gray-400'
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0', badgeColor)}>
          {badge}
        </span>
      )}
      {isActive && !badge && <ChevronRight size={13} className="text-violet-400/50 flex-shrink-0" />}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#09090f] border-r border-[#1a1a2e] flex flex-col z-40 overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#1a1a2e] flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50 group-hover:shadow-violet-900/70 transition-shadow flex-shrink-0">
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">influctor</span>
            <div className="text-[9px] text-violet-400 font-medium -mt-0.5">Social Growth Platform</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {/* Creator tools */}
        <div className="mb-2 mt-1 px-2">
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Creator</span>
        </div>
        {creatorNav.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}

        {/* Growth & Monetization */}
        <div className="mb-2 mt-4 px-2">
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Crecimiento</span>
        </div>
        {growthNav.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}

        {/* Business */}
        <div className="mb-2 mt-4 px-2">
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Empresas & Marcas</span>
        </div>
        {businessNav.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}

        {/* Settings */}
        <div className="mb-2 mt-4 px-2">
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Sistema</span>
        </div>
        <NavItem
          href="/settings"
          label="Configuración"
          icon={Settings}
          isActive={pathname === '/settings'}
        />
      </nav>

      {/* User bottom */}
      <div className="px-3 py-3 border-t border-[#1a1a2e] flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-all">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-200 truncate">Alex Creator</div>
            <div className="text-[10px] text-gray-600 truncate">demo@influctor.app</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
        </div>
      </div>
    </aside>
  )
}
