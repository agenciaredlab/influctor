'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard, Target, Megaphone, BarChart3, Sparkles,
  Settings, Zap, ChevronRight, Flame, DollarSign, Handshake,
  CalendarDays, BookOpen, Building2, Users2, FileText,
  Hash, SplitSquareVertical, RefreshCw, Search, TrendingUp,
  Mail, Trophy, ClipboardList, CreditCard, ShoppingBag, ShieldCheck, Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Logo from '@/components/Logo'

const creatorNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/viral-lab', label: 'Viral Lab', icon: Flame, badge: 'HOT', badgeColor: 'text-orange-300 bg-orange-500/20 border-orange-500/30' },
  { href: '/goals', label: 'Metas & Objetivos', icon: Target },
  { href: '/campaigns', label: 'Campañas', icon: Megaphone },
  { href: '/calendar', label: 'Calendario', icon: CalendarDays },
  { href: '/analytics', label: 'Analytics & Ingresos', icon: BarChart3 },
]

const growthNav = [
  { href: '/monetization', label: 'Monetización', icon: DollarSign },
  { href: '/marketplace', label: 'Marketplace Deals', icon: ShoppingBag, badge: 'NUEVO', badgeColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30' },
  { href: '/deals', label: 'Brand Deals CRM', icon: Handshake },
  { href: '/outreach', label: 'Outreach Kit', icon: Mail, badge: 'NUEVO', badgeColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30' },
  { href: '/playbooks', label: 'Playbooks', icon: BookOpen },
  { href: '/reports', label: 'Reportes', icon: ClipboardList, badge: 'NUEVO', badgeColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30' },
]

const contentNav = [
  { href: '/ai-studio', label: 'AI Studio', icon: Sparkles },
  { href: '/scripts', label: 'Script Writer', icon: FileText, badge: 'NUEVO', badgeColor: 'text-violet-300 bg-violet-500/20 border-violet-500/30' },
  { href: '/repurpose', label: 'Repurposing IA', icon: RefreshCw, badge: 'NUEVO', badgeColor: 'text-pink-300 bg-pink-500/20 border-pink-500/30' },
  { href: '/hashtags', label: 'Hashtag Explorer', icon: Hash, badge: 'NUEVO', badgeColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30' },
  { href: '/ab-test', label: 'A/B Captions', icon: SplitSquareVertical, badge: 'NUEVO', badgeColor: 'text-amber-300 bg-amber-500/20 border-amber-500/30' },
]

const intelligenceNav = [
  { href: '/competitors', label: 'Competitor Tracker', icon: Search, badge: 'NUEVO', badgeColor: 'text-red-300 bg-red-500/20 border-red-500/30' },
  { href: '/niche-finder', label: 'Niche Finder', icon: TrendingUp, badge: 'NUEVO', badgeColor: 'text-lime-300 bg-lime-500/20 border-lime-500/30' },
]

const businessNav = [
  { href: '/business', label: 'Herramientas Pro', icon: Building2 },
  { href: '/influencer-discovery', label: 'Buscar Influencers', icon: Users2, badge: 'NUEVO', badgeColor: 'text-blue-300 bg-blue-500/20 border-blue-500/30' },
  { href: '/contracts', label: 'Contratos', icon: FileText, badge: 'NUEVO', badgeColor: 'text-purple-300 bg-purple-500/20 border-purple-500/30' },
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
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group',
        isActive
          ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20'
          : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
      )}
    >
      <Icon size={15} className={cn('flex-shrink-0', isActive ? 'text-violet-400' : 'text-gray-600 group-hover:text-gray-400')} />
      <span className="flex-1 truncate text-xs">{label}</span>
      {badge && (
        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0', badgeColor)}>
          {badge}
        </span>
      )}
      {isActive && !badge && <ChevronRight size={11} className="text-violet-400/50 flex-shrink-0" />}
    </Link>
  )
}

function NavSection({ title, items, pathname }: { title: string; items: typeof creatorNav; pathname: string }) {
  return (
    <>
      <div className="mb-1 mt-3 px-2">
        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{title}</span>
      </div>
      {items.map(item => (
        <NavItem
          key={item.href}
          {...item}
          isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
        />
      ))}
    </>
  )
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Plan Free',
  creator: 'Plan Creator',
  pro: 'Plan Pro',
}

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userName  = session?.user?.name || session?.user?.email?.split('@')[0] || 'Usuario'
  const userPlan  = (session?.user as any)?.plan    ?? 'free'
  const isAdmin   = (session?.user as any)?.isAdmin ?? false
  const planLabel = PLAN_LABELS[userPlan] ?? 'Plan Free'
  const initial = userName.charAt(0).toUpperCase()

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#09090f] border-r border-[#1a1a2e] flex flex-col z-40 overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-3 border-b border-[#1a1a2e] flex-shrink-0">
        <Logo size="sm" href="/dashboard" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
        <NavSection title="Creator" items={creatorNav} pathname={pathname} />
        <NavSection title="Crecimiento" items={growthNav} pathname={pathname} />
        <NavSection title="Contenido IA" items={contentNav} pathname={pathname} />
        <NavSection title="Inteligencia" items={intelligenceNav} pathname={pathname} />
        <NavSection title="Empresas & Marcas" items={businessNav} pathname={pathname} />
        <div className="mb-1 mt-3 px-2">
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Sistema</span>
        </div>
        <NavItem href="/settings" label="Configuración" icon={Settings} isActive={pathname === '/settings'} />
        <NavItem href="/pricing" label="Planes & Precios" icon={CreditCard} isActive={pathname === '/pricing'} />
        {isAdmin && (
          <>
            <NavItem href="/admin" label="Admin" icon={ShieldCheck} isActive={pathname === '/admin'} badge="ADMIN" badgeColor="text-red-300 bg-red-500/20 border-red-500/30" />
            <NavItem href="/admin/users" label="Usuarios" icon={Users} isActive={pathname.startsWith('/admin/users')} />
          </>
        )}
      </nav>

      {/* User + Plan badge */}
      <div className="px-2 py-2 border-t border-[#1a1a2e] flex-shrink-0 space-y-1.5">
        {/* Upgrade CTA — hidden for Pro users */}
        {userPlan !== 'pro' && (
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gradient-to-r from-violet-600/20 to-purple-600/10 border border-violet-500/20 hover:border-violet-500/40 transition-all group"
          >
            <Zap size={11} className="text-violet-400 flex-shrink-0" />
            <span className="text-[10px] font-medium text-violet-300 flex-1">Actualizar plan</span>
            <ChevronRight size={9} className="text-violet-500 group-hover:text-violet-300" />
          </Link>
        )}
        <Link href="/settings" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-all">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">{initial}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-200 truncate">{userName}</div>
            <div className="text-[9px] text-gray-600 truncate">{planLabel}</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
        </Link>
      </div>
    </aside>
  )
}
