'use client'

import { useState } from 'react'
import {
  Search, Filter, Briefcase, DollarSign, Users, TrendingUp,
  MapPin, Clock, Tag, ChevronRight, Star, Zap, CheckCircle,
  Send, X, ExternalLink, Building2, Globe, AlertCircle,
  Sparkles, ArrowRight, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import UpgradeGate from '@/components/ui/UpgradeGate'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Listing {
  id: string
  title: string
  brandName: string
  brandLogo?: string | null
  budget: number
  budgetMax?: number | null
  budgetType: string
  currency: string
  type: string
  platforms: string
  niche?: string | null
  description: string
  deliverables?: string | null
  deadline?: string | null
  requirements?: string | null
  location?: string | null
  status: string
  featured: boolean
  applicantsCount: number
  createdAt: string
}

interface Application {
  id: string
  message: string
  proposedRate?: number | null
  status: string
  createdAt: string
  listing: Listing
}

interface Props {
  initialListings: Listing[]
  myApplications: Application[]
  plan: string
  stats: { open: number; brands: number; totalBudget: number }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NICHES    = ['Todos', 'Fitness', 'Negocios', 'Moda', 'Belleza', 'Gaming', 'Finanzas', 'Tecnología', 'Bienestar', 'Diseño', 'Gastronomía']
const PLATFORMS = ['Todas', 'instagram', 'tiktok', 'youtube', 'linkedin']
const TYPES: Record<string, string> = {
  sponsored_post: 'Post patrocinado', video: 'Video', reel: 'Reel/Short',
  story: 'Stories', ambassador: 'Brand Ambassador', ugc: 'UGC',
  affiliate: 'Afiliado', series: 'Serie de contenido',
}
const TYPE_OPTS = ['Todos', ...Object.keys(TYPES)]

const PLATFORM_EMOJIS: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', youtube: '▶️', linkedin: '💼', twitter: '🐦',
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'text-amber-400 bg-amber-500/10 border-amber-500/20',
  viewed:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  shortlisted: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  accepted:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  rejected:    'text-red-400 bg-red-500/10 border-red-500/20',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', viewed: 'Visto', shortlisted: 'Preseleccionado',
  accepted: 'Aceptado', rejected: 'Rechazado',
}

function formatBudget(l: Listing) {
  if (l.budgetType === 'negotiable') return 'Negociable'
  if (l.budgetType === 'affiliate')  return 'Comisión'
  if (l.budgetType === 'range' && l.budgetMax)
    return `$${l.budget.toLocaleString()}–$${l.budgetMax.toLocaleString()}`
  if (l.budget === 0) return 'A convenir'
  return `$${l.budget.toLocaleString()}`
}

function daysLeft(deadline?: string | null) {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  return diff
}

function brandInitial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

function ListingCard({
  listing, isApplied, appliedStatus, canApply, onSelect, onApply,
}: {
  listing: Listing
  isApplied: boolean
  appliedStatus?: string
  canApply: boolean
  onSelect: () => void
  onApply: () => void
}) {
  const days = daysLeft(listing.deadline)
  const platforms = listing.platforms.split(',').map(p => p.trim())

  return (
    <div
      className={cn(
        'bg-[#13131f] border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-500/30 group',
        listing.featured ? 'border-violet-500/30' : 'border-[#1a1a2e]'
      )}
      onClick={onSelect}
    >
      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-blue-600/20 border border-[#1a1a2e] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {brandInitial(listing.brandName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {listing.featured && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-amber-300 bg-amber-500/10 border-amber-500/20 flex-shrink-0">
                ⭐ DESTACADO
              </span>
            )}
            <span className="text-[10px] text-gray-500">{listing.brandName}</span>
          </div>
          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 group-hover:text-violet-300 transition-colors">
            {listing.title}
          </h3>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {listing.niche && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
            {listing.niche}
          </span>
        )}
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] text-gray-400">
          {TYPES[listing.type] ?? listing.type}
        </span>
        {platforms.map(p => (
          <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a2e] text-gray-400">
            {PLATFORM_EMOJIS[p] ?? ''} {p}
          </span>
        ))}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1a1a2e]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <DollarSign size={11} /> {formatBudget(listing)}
          </div>
          {listing.location && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={9} /> {listing.location}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {days !== null && (
            <span className={cn('text-[10px]', days <= 7 ? 'text-red-400' : 'text-gray-500')}>
              <Clock size={9} className="inline mr-0.5" />
              {days <= 0 ? 'Vencido' : `${days}d`}
            </span>
          )}
          <span className="text-[10px] text-gray-600">
            <Users size={9} className="inline mr-0.5" />{listing.applicantsCount}
          </span>
          {isApplied ? (
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', STATUS_COLORS[appliedStatus ?? 'pending'])}>
              ✓ {STATUS_LABELS[appliedStatus ?? 'pending']}
            </span>
          ) : canApply ? (
            <button
              onClick={e => { e.stopPropagation(); onApply() }}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Aplicar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function ListingDetail({
  listing, isApplied, appliedStatus, canApply, onApply, onClose,
}: {
  listing: Listing
  isApplied: boolean
  appliedStatus?: string
  canApply: boolean
  onApply: () => void
  onClose: () => void
}) {
  const days = daysLeft(listing.deadline)
  const platforms = listing.platforms.split(',').map(p => p.trim())
  let deliverables: string[] = []
  try { deliverables = listing.deliverables ? JSON.parse(listing.deliverables) : [] } catch {}

  return (
    <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5 sticky top-24 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/30 to-blue-600/20 border border-[#1a1a2e] flex items-center justify-center text-white font-bold text-lg">
            {brandInitial(listing.brandName)}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-0.5">{listing.brandName}</div>
            <h2 className="font-bold text-white text-sm leading-snug">{listing.title}</h2>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 flex-shrink-0 mt-0.5">
          <X size={14} />
        </button>
      </div>

      {/* Budget + meta */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: DollarSign, label: 'Presupuesto', value: formatBudget(listing), color: 'text-emerald-400' },
          { icon: Tag, label: 'Tipo', value: TYPES[listing.type] ?? listing.type, color: 'text-violet-400' },
          { icon: MapPin, label: 'Ubicación', value: listing.location ?? 'Global', color: 'text-blue-400' },
          { icon: Clock, label: 'Deadline', value: days !== null ? (days <= 0 ? 'Vencido' : `${days} días`) : 'Sin fecha', color: days !== null && days <= 7 ? 'text-red-400' : 'text-gray-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[#0d0d1a] rounded-lg p-2.5">
            <Icon size={11} className={cn('mb-1', color)} />
            <div className="text-xs font-semibold text-white">{value}</div>
            <div className="text-[10px] text-gray-600">{label}</div>
          </div>
        ))}
      </div>

      {/* Platforms */}
      <div className="flex flex-wrap gap-1.5">
        {platforms.map(p => (
          <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-[#0d0d1a] border border-[#1a1a2e] text-gray-300">
            {PLATFORM_EMOJIS[p] ?? ''} {p}
          </span>
        ))}
      </div>

      {/* Description */}
      <div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descripción</div>
        <p className="text-xs text-gray-400 leading-relaxed">{listing.description}</p>
      </div>

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Entregables</div>
          <div className="space-y-1.5">
            {deliverables.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                <CheckCircle size={11} className="text-emerald-400 mt-0.5 flex-shrink-0" /> {d}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      {listing.requirements && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Requisitos</div>
          <p className="text-xs text-gray-400">{listing.requirements}</p>
        </div>
      )}

      {/* Applicants */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Users size={11} /> {listing.applicantsCount} personas han aplicado
      </div>

      {/* CTA */}
      {isApplied ? (
        <div className={cn('flex items-center gap-2 p-3 rounded-xl border text-sm font-medium', STATUS_COLORS[appliedStatus ?? 'pending'])}>
          <CheckCircle size={14} /> Aplicación enviada — {STATUS_LABELS[appliedStatus ?? 'pending']}
        </div>
      ) : canApply ? (
        <button
          onClick={onApply}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Send size={13} /> Aplicar ahora
        </button>
      ) : (
        <UpgradeGate
          plan="free"
          requiredPlan="creator"
          feature="Aplicar a oportunidades"
          description="Necesitas el plan Creator para enviar tu candidatura a marcas."
          variant="banner"
        />
      )}
    </div>
  )
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────

function ApplyModal({
  listing, onClose, onSubmit,
}: {
  listing: Listing
  onClose: () => void
  onSubmit: (data: { message: string; proposedRate?: number; portfolio?: string }) => void
}) {
  const [message, setMessage]           = useState('')
  const [proposedRate, setProposedRate] = useState('')
  const [portfolio, setPortfolio]       = useState('')
  const [submitting, setSubmitting]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    await onSubmit({
      message,
      proposedRate: proposedRate ? Number(proposedRate) : undefined,
      portfolio: portfolio || undefined,
    })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#13131f] border border-[#1a1a2e] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-white">Aplicar a oportunidad</h2>
            <p className="text-xs text-gray-500 mt-0.5">{listing.brandName} · {listing.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block font-medium">
              Carta de presentación <span className="text-red-400">*</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder="Cuéntale a la marca por qué eres el creador ideal para esta colaboración. Habla de tu audiencia, tu estilo y por qué encaja con su producto..."
              className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
              required
            />
            <div className={cn('text-[10px] mt-1 text-right', message.length < 50 ? 'text-red-400' : 'text-gray-600')}>
              {message.length} / mín. 50 caracteres
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium">Tu tarifa propuesta ($)</label>
              <input
                type="number"
                value={proposedRate}
                onChange={e => setProposedRate(e.target.value)}
                placeholder="ej. 800"
                className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium">Portfolio / Perfil (URL)</label>
              <input
                type="url"
                value={portfolio}
                onChange={e => setPortfolio(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-[#0d0d1a] rounded-xl border border-[#1a1a2e]">
            <AlertCircle size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500">
              La marca recibirá tu mensaje y podrá contactarte directamente. Influctor no gestiona pagos ni acuerdos.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#1a1a2e] text-gray-400 hover:text-gray-200 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || message.length < 50}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting
                ? 'Enviando...'
                : <><Send size={13} /> Enviar aplicación</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketplaceClient({ initialListings, myApplications, plan, stats }: Props) {
  const [listings, setListings]     = useState<Listing[]>(initialListings)
  const [applications, setApps]     = useState<Application[]>(myApplications)
  const [tab, setTab]               = useState<'listings' | 'myapps'>('listings')
  const [search, setSearch]         = useState('')
  const [niche, setNiche]           = useState('Todos')
  const [platform, setPlatform]     = useState('Todas')
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected]     = useState<Listing | null>(null)
  const [applying, setApplying]     = useState<Listing | null>(null)
  const [toast, setToast]           = useState<{ ok: boolean; msg: string } | null>(null)

  const canApply = plan !== 'free'

  // Applied listings map
  const appliedMap = applications.reduce<Record<string, string>>((acc, a) => {
    acc[a.listing.id] = a.status
    return acc
  }, {})

  // Filter listings
  const filtered = listings.filter(l => {
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) &&
        !l.brandName.toLowerCase().includes(search.toLowerCase()) &&
        !(l.niche ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (niche !== 'Todos' && l.niche !== niche) return false
    if (platform !== 'Todas' && !l.platforms.includes(platform)) return false
    if (typeFilter !== 'Todos' && l.type !== typeFilter) return false
    return true
  })

  async function submitApplication(data: { message: string; proposedRate?: number; portfolio?: string }) {
    if (!applying) return
    try {
      const res = await fetch(`/api/marketplace/listings/${applying.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Optimistic update
      setApps(prev => [...prev, {
        id: json.application.id,
        message: data.message,
        proposedRate: data.proposedRate ?? null,
        portfolio: data.portfolio ?? null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        listing: applying,
      }])
      setListings(prev => prev.map(l => l.id === applying.id
        ? { ...l, applicantsCount: l.applicantsCount + 1 }
        : l
      ))
      showToast(true, '¡Aplicación enviada! La marca revisará tu perfil.')
      setApplying(null)
    } catch (err: any) {
      showToast(false, err.message)
    }
  }

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium max-w-sm',
          toast.ok
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        )}>
          {toast.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Apply modal */}
      {applying && (
        <ApplyModal
          listing={applying}
          onClose={() => setApplying(null)}
          onSubmit={submitApplication}
        />
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Briefcase, label: 'Oportunidades abiertas', value: stats.open, color: 'text-violet-400 bg-violet-500/10' },
          { icon: Building2, label: 'Marcas activas', value: stats.brands, color: 'text-blue-400 bg-blue-500/10' },
          { icon: DollarSign, label: 'Presupuesto total disponible', value: `$${(stats.totalBudget / 1000).toFixed(0)}K+`, color: 'text-emerald-400 bg-emerald-500/10', raw: true },
        ].map(({ icon: Icon, label, value, color, raw }) => (
          <div key={label} className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 flex items-center gap-3">
            <div className={cn('p-2.5 rounded-lg', color)}>
              <Icon size={16} className={color.split(' ')[0]} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{raw ? value : Number(value).toLocaleString()}</div>
              <div className="text-[11px] text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#13131f] border border-[#1a1a2e] rounded-xl p-1 w-fit">
        {([
          { id: 'listings', label: 'Oportunidades', count: stats.open },
          { id: 'myapps', label: 'Mis aplicaciones', count: applications.length },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.id ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-300'
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', tab === t.id ? 'bg-white/20 text-white' : 'bg-[#1a1a2e] text-gray-400')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: LISTINGS ─────────────────────────────────────────── */}
      {tab === 'listings' && (
        <div className="space-y-4">
          {/* Plan gate for free users */}
          {plan === 'free' && (
            <UpgradeGate
              plan={plan}
              requiredPlan="creator"
              feature="Aplicar a Brand Deals"
              description="Con el plan Creator puedes enviar tu candidatura a todas las oportunidades y que marcas te contacten directamente."
              variant="banner"
            />
          )}

          {/* Search + filters */}
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por marca, nicho o título..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-colors', showFilters ? 'bg-violet-600 border-violet-500 text-white' : 'bg-[#0d0d1a] border-[#1a1a2e] text-gray-400 hover:text-gray-200')}
              >
                <Filter size={13} /> Filtros
              </button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#1a1a2e]">
                {[
                  { label: 'Nicho', value: niche, opts: NICHES, set: setNiche },
                  { label: 'Plataforma', value: platform, opts: PLATFORMS, set: setPlatform },
                  { label: 'Tipo', value: typeFilter, opts: TYPE_OPTS.map(k => k === 'Todos' ? 'Todos' : (TYPES[k] ? `${k}` : k)), set: setTypeFilter },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                    <select
                      value={f.value}
                      onChange={e => f.set(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
                    >
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Listings grid */}
            <div className={cn('space-y-3', selected ? 'lg:col-span-2' : 'lg:col-span-3')}>
              <div className="text-xs text-gray-500">{filtered.length} oportunidades encontradas</div>
              {filtered.length === 0 ? (
                <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-10 text-center">
                  <Briefcase size={32} className="mx-auto mb-3 text-gray-700" />
                  <p className="text-sm text-gray-500">No hay oportunidades con esos filtros</p>
                </div>
              ) : (
                <div className={cn('grid gap-3', selected ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3')}>
                  {filtered.map(l => (
                    <ListingCard
                      key={l.id}
                      listing={l}
                      isApplied={!!appliedMap[l.id]}
                      appliedStatus={appliedMap[l.id]}
                      canApply={canApply}
                      onSelect={() => setSelected(selected?.id === l.id ? null : l)}
                      onApply={() => setApplying(l)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="lg:col-span-1">
                <ListingDetail
                  listing={selected}
                  isApplied={!!appliedMap[selected.id]}
                  appliedStatus={appliedMap[selected.id]}
                  canApply={canApply}
                  onApply={() => setApplying(selected)}
                  onClose={() => setSelected(null)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: MY APPLICATIONS ──────────────────────────────────── */}
      {tab === 'myapps' && (
        <div className="space-y-3">
          {applications.length === 0 ? (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-12 text-center">
              <Send size={32} className="mx-auto mb-4 text-gray-700" />
              <p className="text-sm text-gray-400 font-medium mb-1">Aún no has aplicado a ninguna oportunidad</p>
              <p className="text-xs text-gray-600 mb-5">Explora las oportunidades disponibles y envía tu candidatura</p>
              <button
                onClick={() => setTab('listings')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
              >
                Ver oportunidades <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            applications.map(app => (
              <div key={app.id} className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-blue-600/20 border border-[#1a1a2e] flex items-center justify-center text-white font-bold flex-shrink-0">
                    {brandInitial(app.listing.brandName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-0.5">
                      <p className="text-sm font-semibold text-white line-clamp-1">{app.listing.title}</p>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0', STATUS_COLORS[app.status])}>
                        {STATUS_LABELS[app.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{app.listing.brandName} · {TYPES[app.listing.type] ?? app.listing.type}</p>
                    <p className="text-xs text-gray-400 bg-[#0d0d1a] rounded-lg p-2.5 italic line-clamp-2">
                      "{app.message}"
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-600">
                      <span>Aplicado {new Date(app.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      {app.proposedRate && <span>· Tarifa propuesta: ${app.proposedRate}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
