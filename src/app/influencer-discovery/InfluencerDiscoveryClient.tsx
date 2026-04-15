'use client'

import { useState, useMemo } from 'react'
import { Search, Users, Zap, DollarSign, Filter, MapPin, ExternalLink, BarChart2, CheckCircle, X, Plus, Loader2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import UpgradeGate from '@/components/ui/UpgradeGate'

interface InfluencerProfile {
  id: string
  name: string
  handle: string
  platform: string
  niche: string | null
  followers: number
  engagement: number
  avgViews: number
  estimatedRate: number
  location: string | null
  bio: string | null
  topics: string | null
  verified: boolean
  recentGrowth: string | null
  profileUrl: string | null
  contactEmail: string | null
}

const TIERS = ['Todos', 'Nano (<10K)', 'Micro (10–100K)', 'Macro (100K–1M)', 'Mega (>1M)']
const NICHES = ['Todos', 'Fitness', 'Negocios', 'Gastronomía', 'Tecnología', 'Moda', 'Finanzas', 'Travel', 'Gaming', 'Belleza', 'Bienestar', 'Diseño']
const PLATFORMS = ['Todas', 'instagram', 'tiktok', 'youtube', 'linkedin', 'twitter']

const TIER_COLORS: Record<string, string> = {
  Nano:  'text-gray-400 bg-gray-500/10',
  Micro: 'text-blue-400 bg-blue-500/10',
  Macro: 'text-violet-400 bg-violet-500/10',
  Mega:  'text-amber-400 bg-amber-500/10',
}

function getTier(followers: number) {
  if (followers >= 1_000_000) return 'Mega'
  if (followers >= 100_000)   return 'Macro'
  if (followers >= 10_000)    return 'Micro'
  return 'Nano'
}

function formatK(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', youtube: '▶️', linkedin: '💼', twitter: '🐦',
}

interface AddModalProps {
  onClose: () => void
  onAdded: (profile: InfluencerProfile) => void
}

function AddInfluencerModal({ onClose, onAdded }: AddModalProps) {
  const [form, setForm] = useState({
    name: '', handle: '', platform: 'instagram', niche: '', followers: '',
    engagement: '', avgViews: '', estimatedRate: '', location: '', bio: '', topics: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/influencer-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      onAdded(data.profile)
      onClose()
    } catch {
      setError('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#13131f] border border-[#1a1a2e] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">Agregar Influencer</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
                placeholder="Nombre completo o artístico" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Handle *</label>
              <input required value={form.handle} onChange={e => set('handle', e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
                placeholder="@handle" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Plataforma *</label>
              <select value={form.platform} onChange={e => set('platform', e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50">
                {PLATFORMS.filter(p => p !== 'Todas').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nicho</label>
              <select value={form.niche} onChange={e => set('niche', e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50">
                <option value="">Sin categoría</option>
                {NICHES.filter(n => n !== 'Todos').map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Seguidores</label>
              <input type="number" value={form.followers} onChange={e => set('followers', e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
                placeholder="128000" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Engagement %</label>
              <input type="number" step="0.1" value={form.engagement} onChange={e => set('engagement', e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
                placeholder="4.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Avg views</label>
              <input type="number" value={form.avgViews} onChange={e => set('avgViews', e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
                placeholder="42000" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tarifa est. (USD/post)</label>
              <input type="number" value={form.estimatedRate} onChange={e => set('estimatedRate', e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
                placeholder="800" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ubicación</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
                placeholder="Madrid, ES" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Topics (separados por coma)</label>
              <input value={form.topics} onChange={e => set('topics', e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
                placeholder="fitness,nutrición,lifestyle" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Bio</label>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50 resize-none"
                placeholder="Descripción breve del influencer..." />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-[#1a1a2e] text-gray-400 hover:text-gray-200 text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {loading ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InfluencerDiscoveryClient({
  plan,
  initialProfiles,
}: {
  plan: string
  initialProfiles: InfluencerProfile[]
}) {
  const [profiles, setProfiles] = useState<InfluencerProfile[]>(initialProfiles)
  const [search, setSearch] = useState('')
  const [niche, setNiche] = useState('Todos')
  const [platform, setPlatform] = useState('Todas')
  const [tier, setTier] = useState('Todos')
  const [selected, setSelected] = useState<InfluencerProfile | null>(null)
  const [compared, setCompared] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCompare, setShowCompare] = useState(false)

  const isPro = plan === 'pro'

  const filtered = useMemo(() => {
    return profiles.filter(inf => {
      if (search) {
        const q = search.toLowerCase()
        const match = inf.name.toLowerCase().includes(q)
          || inf.handle.toLowerCase().includes(q)
          || (inf.niche ?? '').toLowerCase().includes(q)
          || (inf.topics ?? '').toLowerCase().includes(q)
        if (!match) return false
      }
      if (niche !== 'Todos' && inf.niche !== niche) return false
      if (platform !== 'Todas' && inf.platform !== platform) return false
      if (tier !== 'Todos') {
        const t = getTier(inf.followers)
        if (!tier.toLowerCase().includes(t.toLowerCase())) return false
      }
      return true
    })
  }, [profiles, search, niche, platform, tier])

  const visibleList = isPro ? filtered : filtered.slice(0, 3)

  function toggleCompare(id: string) {
    setCompared(prev =>
      prev.includes(id) ? prev.filter(c => c !== id)
        : prev.length < 3 ? [...prev, id]
        : prev
    )
  }

  const compareList = profiles.filter(i => compared.includes(i.id))

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className={cn('bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 space-y-3', !isPro && 'opacity-60 pointer-events-none select-none')}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, handle o nicho..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
              disabled={!isPro}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-colors', showFilters ? 'bg-violet-600 border-violet-500 text-white' : 'bg-[#0d0d1a] border-[#1a1a2e] text-gray-400 hover:text-gray-200')}
          >
            <Filter size={13} /> Filtros
          </button>
          {isPro && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border border-violet-500/30 bg-violet-600/10 text-violet-300 hover:bg-violet-600/20 transition-colors"
            >
              <Plus size={13} /> Agregar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#1a1a2e]">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nicho</label>
              <select value={niche} onChange={e => setNiche(e.target.value)} className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50">
                {NICHES.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Plataforma</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50">
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tier</label>
              <select value={tier} onChange={e => setTier(e.target.value)} className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50">
                {TIERS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Compare bar */}
      {compared.length > 0 && (
        <div className="bg-violet-900/20 border border-violet-500/30 rounded-xl p-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-violet-300 font-medium">Comparando {compared.length}/3:</span>
          {compareList.map(inf => (
            <div key={inf.id} className="flex items-center gap-1.5 bg-violet-500/20 rounded-full px-2.5 py-1">
              <span className="text-xs text-violet-200">{inf.name}</span>
              <button onClick={() => toggleCompare(inf.id)} className="text-violet-400 hover:text-white"><X size={10} /></button>
            </div>
          ))}
          {compared.length >= 2 && (
            <button
              onClick={() => setShowCompare(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-full transition-colors"
            >
              <BarChart2 size={11} /> Ver comparativa
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-xs text-gray-500">
            {isPro
              ? `${filtered.length} influencer${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`
              : `Mostrando 3 de ${filtered.length} resultados`}
          </div>

          {visibleList.length === 0 ? (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-10 text-center">
              <Users size={28} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-500 mb-2">No se encontraron influencers</p>
              {isPro && (
                <button onClick={() => setShowAddModal(true)} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  + Agregar el primero
                </button>
              )}
            </div>
          ) : (
            visibleList.map(inf => {
              const t = getTier(inf.followers)
              return (
                <div
                  key={inf.id}
                  onClick={() => setSelected(inf)}
                  className={cn(
                    'bg-[#13131f] border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-500/30',
                    selected?.id === inf.id ? 'border-violet-500/40' : 'border-[#1a1a2e]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                      {inf.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-white text-sm">{inf.name}</span>
                        {inf.verified && <CheckCircle size={12} className="text-blue-400" />}
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', TIER_COLORS[t])}>{t}</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {inf.handle} · {PLATFORM_ICONS[inf.platform] ?? ''} {inf.platform}
                        {inf.location && <> · <MapPin className="inline" size={9} /> {inf.location}</>}
                      </div>
                      {inf.topics && (
                        <div className="flex flex-wrap gap-1">
                          {inf.topics.split(',').map(t => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a1a2e] text-gray-500">#{t.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold text-white">{formatK(inf.followers)}</div>
                      <div className="text-[10px] text-gray-500">seguidores</div>
                      {inf.recentGrowth && (
                        <div className="text-xs text-emerald-400 mt-1">{inf.recentGrowth}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1a1a2e]">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Zap size={10} className="text-amber-400" /> {inf.engagement}% eng
                    </div>
                    {inf.avgViews > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <BarChart2 size={10} className="text-blue-400" /> {formatK(inf.avgViews)} avg
                      </div>
                    )}
                    {inf.estimatedRate > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <DollarSign size={10} className="text-emerald-400" /> ~${inf.estimatedRate}/post
                      </div>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toggleCompare(inf.id) }}
                      className={cn('ml-auto text-xs px-2.5 py-1 rounded-lg border transition-colors',
                        compared.includes(inf.id)
                          ? 'bg-violet-600/20 border-violet-500/30 text-violet-300'
                          : 'border-[#1a1a2e] text-gray-500 hover:text-gray-300'
                      )}
                    >
                      {compared.includes(inf.id) ? '✓ Comparando' : '+ Comparar'}
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {!isPro && filtered.length > 0 && (
            <UpgradeGate
              plan={plan}
              requiredPlan="pro"
              feature="Influencer Discovery Completo"
              description={`Accede a la base de datos completa de ${profiles.length}+ influencers con filtros avanzados, comparativas y datos de contacto.`}
              variant="block"
            />
          )}
        </div>

        {/* Detail panel */}
        <div>
          {selected ? (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 space-y-4 sticky top-24">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl">
                  {selected.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-white">{selected.name}</h3>
                    {selected.verified && <CheckCircle size={13} className="text-blue-400" />}
                  </div>
                  <div className="text-xs text-gray-500">{selected.handle} · {selected.platform}</div>
                  {selected.location && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={9} /> {selected.location}
                    </div>
                  )}
                </div>
              </div>

              {selected.bio && <p className="text-xs text-gray-400">{selected.bio}</p>}

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Seguidores', value: formatK(selected.followers) },
                  { label: 'Engagement', value: `${selected.engagement}%` },
                  ...(selected.avgViews > 0 ? [{ label: 'Avg views', value: formatK(selected.avgViews) }] : []),
                  ...(selected.estimatedRate > 0 ? [{ label: 'Tarifa est.', value: `$${selected.estimatedRate}` }] : []),
                ].map(stat => (
                  <div key={stat.label} className="bg-[#0d0d1a] rounded-lg p-2.5 text-center">
                    <div className="text-sm font-bold text-white">{stat.value}</div>
                    <div className="text-[10px] text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {selected.topics && (
                <div className="flex flex-wrap gap-1">
                  {selected.topics.split(',').map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a1a2e] text-gray-500">#{t.trim()}</span>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                {selected.profileUrl ? (
                  <a href={selected.profileUrl} target="_blank" rel="noopener noreferrer"
                    className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <ExternalLink size={13} /> Ver perfil
                  </a>
                ) : (
                  <button disabled className="w-full py-2 rounded-lg bg-violet-600/30 text-gray-500 text-sm cursor-not-allowed flex items-center justify-center gap-2">
                    <ExternalLink size={13} /> Sin enlace
                  </button>
                )}
                {selected.contactEmail ? (
                  <a href={`mailto:${selected.contactEmail}`}
                    className="w-full py-2 rounded-lg border border-[#1a1a2e] text-gray-300 hover:text-white hover:border-violet-500/30 text-sm transition-colors flex items-center justify-center gap-2">
                    <Mail size={13} /> Contactar
                  </a>
                ) : selected.profileUrl ? (
                  <a href={selected.profileUrl} target="_blank" rel="noopener noreferrer"
                    className="w-full py-2 rounded-lg border border-[#1a1a2e] text-gray-300 hover:text-white hover:border-violet-500/30 text-sm transition-colors flex items-center justify-center gap-2">
                    <Mail size={13} /> Contactar
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-6 text-center">
              <Users size={28} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-500">Selecciona un influencer para ver su perfil detallado</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddInfluencerModal
          onClose={() => setShowAddModal(false)}
          onAdded={profile => setProfiles(prev => [profile, ...prev])}
        />
      )}

      {/* Comparison modal */}
      {showCompare && compareList.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-2xl p-6 w-full max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <BarChart2 size={16} className="text-violet-400" /> Comparativa de influencers
              </h3>
              <button onClick={() => setShowCompare(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>

            {/* Column headers */}
            <div className={`grid gap-4`} style={{ gridTemplateColumns: `180px repeat(${compareList.length}, 1fr)` }}>
              <div /> {/* row label column */}
              {compareList.map(inf => (
                <div key={inf.id} className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
                    {inf.name[0]}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{inf.name}</p>
                  <p className="text-xs text-gray-500">{inf.handle}</p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block', TIER_COLORS[getTier(inf.followers)])}>
                    {getTier(inf.followers)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1">
              {[
                { label: 'Plataforma',     getValue: (i: InfluencerProfile) => `${PLATFORM_ICONS[i.platform] ?? ''} ${i.platform}` },
                { label: 'Seguidores',     getValue: (i: InfluencerProfile) => formatK(i.followers), highlight: true },
                { label: 'Engagement',     getValue: (i: InfluencerProfile) => `${i.engagement}%`, highlight: true },
                { label: 'Avg views',      getValue: (i: InfluencerProfile) => i.avgViews > 0 ? formatK(i.avgViews) : '—' },
                { label: 'Tarifa est.',    getValue: (i: InfluencerProfile) => i.estimatedRate > 0 ? `$${i.estimatedRate}/post` : '—' },
                { label: 'Nicho',          getValue: (i: InfluencerProfile) => i.niche ?? '—' },
                { label: 'Ubicación',      getValue: (i: InfluencerProfile) => i.location ?? '—' },
                { label: 'Crecimiento',    getValue: (i: InfluencerProfile) => i.recentGrowth ?? '—' },
              ].map(row => (
                <div key={row.label} className={`grid gap-4 py-2.5 px-2 rounded-lg ${row.highlight ? 'bg-[#0d0d1a]' : ''}`}
                  style={{ gridTemplateColumns: `180px repeat(${compareList.length}, 1fr)` }}>
                  <span className="text-xs text-gray-500 self-center">{row.label}</span>
                  {compareList.map(inf => (
                    <span key={inf.id} className="text-xs text-gray-200 text-center self-center font-medium">{row.getValue(inf)}</span>
                  ))}
                </div>
              ))}
            </div>

            {/* Action row */}
            <div className={`grid gap-4 mt-4 pt-4 border-t border-[#1a1a2e]`} style={{ gridTemplateColumns: `180px repeat(${compareList.length}, 1fr)` }}>
              <span className="text-xs text-gray-500 self-center">Acciones</span>
              {compareList.map(inf => (
                <div key={inf.id} className="flex flex-col gap-1.5">
                  {inf.profileUrl ? (
                    <a href={inf.profileUrl} target="_blank" rel="noopener noreferrer"
                      className="py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1">
                      <ExternalLink size={11} /> Ver perfil
                    </a>
                  ) : null}
                  {inf.contactEmail ? (
                    <a href={`mailto:${inf.contactEmail}`}
                      className="py-1.5 rounded-lg border border-[#1a1a2e] text-gray-300 hover:text-white text-xs transition-colors flex items-center justify-center gap-1">
                      <Mail size={11} /> Contactar
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
