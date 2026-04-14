'use client'

import { useState } from 'react'
import { Search, Users, Zap, DollarSign, Star, Filter, MapPin, ExternalLink, BarChart2, Heart, MessageCircle, CheckCircle, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEMO_INFLUENCERS = [
  { id: '1', name: 'Sofia Vega', handle: '@sofiavega.fit', platform: 'instagram', niche: 'Fitness', followers: 128000, engagement: 5.2, avgViews: 42000, location: 'Madrid, ES', tier: 'Micro', rate: 800, verified: true, topics: ['fitness', 'nutrición', 'lifestyle'], recentGrowth: '+2.1K/sem', bio: 'Entrenadora personal & nutricionista. Transformaciones reales.' },
  { id: '2', name: 'Carlos Builds', handle: '@carlosbuilds', platform: 'tiktok', niche: 'Negocios', followers: 89000, engagement: 8.4, avgViews: 95000, location: 'México DF', tier: 'Micro', rate: 600, verified: false, topics: ['emprendimiento', 'dropshipping', 'ecommerce'], recentGrowth: '+5.3K/sem', bio: 'Emprendedor digital. Construyo negocios online desde 0.' },
  { id: '3', name: 'Elena Cooks', handle: '@elenacooks_es', platform: 'instagram', niche: 'Gastronomía', followers: 312000, engagement: 3.8, avgViews: 68000, location: 'Barcelona, ES', tier: 'Macro', rate: 2200, verified: true, topics: ['cocina', 'recetas', 'food'], recentGrowth: '+4.1K/sem', bio: 'Chef profesional. Recetas fáciles para el día a día.' },
  { id: '4', name: 'David Tech', handle: '@davidtech_ia', platform: 'youtube', niche: 'Tecnología', followers: 245000, engagement: 4.1, avgViews: 87000, location: 'Buenos Aires, AR', tier: 'Macro', rate: 1800, verified: true, topics: ['IA', 'tech', 'productividad'], recentGrowth: '+3.8K/sem', bio: 'Exploro el futuro de la tecnología y la IA.' },
  { id: '5', name: 'Luna Moda', handle: '@lunamoda_style', platform: 'instagram', niche: 'Moda', followers: 67000, engagement: 6.9, avgViews: 28000, location: 'Colombia', tier: 'Micro', rate: 450, verified: false, topics: ['moda', 'outfit', 'tendencias'], recentGrowth: '+1.9K/sem', bio: 'Fashion creator. Looks para cada ocasión y presupuesto.' },
  { id: '6', name: 'Alex Finance', handle: '@alexfinancemx', platform: 'tiktok', niche: 'Finanzas', followers: 445000, engagement: 7.2, avgViews: 180000, location: 'México', tier: 'Macro', rate: 3500, verified: true, topics: ['inversiones', 'ahorro', 'crypto'], recentGrowth: '+12K/sem', bio: 'Finanzas personales sin complicaciones para millenials.' },
]

const TIERS = ['Todos', 'Nano (<10K)', 'Micro (10-100K)', 'Macro (100K-1M)', 'Mega (>1M)']
const NICHES = ['Todos', 'Fitness', 'Negocios', 'Gastronomía', 'Tecnología', 'Moda', 'Finanzas', 'Travel', 'Gaming']
const PLATFORMS = ['Todas', 'instagram', 'tiktok', 'youtube', 'linkedin']

const TIER_COLORS: Record<string, string> = {
  'Nano': 'text-gray-400 bg-gray-500/10',
  'Micro': 'text-blue-400 bg-blue-500/10',
  'Macro': 'text-violet-400 bg-violet-500/10',
  'Mega': 'text-amber-400 bg-amber-500/10',
}

function formatK(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

export default function InfluencerDiscoveryClient() {
  const [search, setSearch] = useState('')
  const [niche, setNiche] = useState('Todos')
  const [platform, setPlatform] = useState('Todas')
  const [tier, setTier] = useState('Todos')
  const [selected, setSelected] = useState<typeof DEMO_INFLUENCERS[0] | null>(null)
  const [compared, setCompared] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const filtered = DEMO_INFLUENCERS.filter(inf => {
    if (search && !inf.name.toLowerCase().includes(search.toLowerCase()) && !inf.handle.toLowerCase().includes(search.toLowerCase()) && !inf.niche.toLowerCase().includes(search.toLowerCase())) return false
    if (niche !== 'Todos' && inf.niche !== niche) return false
    if (platform !== 'Todas' && inf.platform !== platform) return false
    if (tier !== 'Todos' && !tier.toLowerCase().includes(inf.tier.toLowerCase())) return false
    return true
  })

  function toggleCompare(id: string) {
    setCompared(prev => prev.includes(id) ? prev.filter(c => c !== id) : prev.length < 3 ? [...prev, id] : prev)
  }

  const compareList = DEMO_INFLUENCERS.filter(i => compared.includes(i.id))

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, handle o nicho..."
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
        <div className="bg-violet-900/20 border border-violet-500/30 rounded-xl p-3 flex items-center gap-3">
          <span className="text-xs text-violet-300 font-medium">Comparando {compared.length}/3:</span>
          {compareList.map(inf => (
            <div key={inf.id} className="flex items-center gap-1.5 bg-violet-500/20 rounded-full px-2.5 py-1">
              <span className="text-xs text-violet-200">{inf.name}</span>
              <button onClick={() => toggleCompare(inf.id)} className="text-violet-400 hover:text-white"><X size={10} /></button>
            </div>
          ))}
          {compared.length >= 2 && (
            <button onClick={() => setSelected(null)} className="ml-auto text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors">
              Ver comparativa
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="text-xs text-gray-500">{filtered.length} influencers encontrados</div>
          {filtered.map(inf => (
            <div
              key={inf.id}
              className={cn(
                'bg-[#13131f] border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-500/30',
                selected?.id === inf.id ? 'border-violet-500/40' : 'border-[#1a1a2e]'
              )}
              onClick={() => setSelected(inf)}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {inf.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-white text-sm">{inf.name}</span>
                    {inf.verified && <CheckCircle size={12} className="text-blue-400" />}
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', TIER_COLORS[inf.tier])}>{inf.tier}</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{inf.handle} · {inf.platform} · <MapPin className="inline" size={9} /> {inf.location}</div>
                  <div className="flex flex-wrap gap-1">
                    {inf.topics.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a1a2e] text-gray-500">#{t}</span>)}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-base font-bold text-white">{formatK(inf.followers)}</div>
                  <div className="text-[10px] text-gray-500">seguidores</div>
                  <div className="text-xs text-emerald-400 mt-1">{inf.recentGrowth}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1a1a2e]">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Zap size={10} className="text-amber-400" /> {inf.engagement}% eng
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <BarChart2 size={10} className="text-blue-400" /> {formatK(inf.avgViews)} avg
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <DollarSign size={10} className="text-emerald-400" /> ~${inf.rate}/post
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={e => { e.stopPropagation(); toggleCompare(inf.id) }}
                    className={cn('text-xs px-2.5 py-1 rounded-lg border transition-colors', compared.includes(inf.id) ? 'bg-violet-600/20 border-violet-500/30 text-violet-300' : 'border-[#1a1a2e] text-gray-500 hover:text-gray-300')}
                  >
                    {compared.includes(inf.id) ? '✓ Comparando' : '+ Comparar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
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
                  <div className="text-xs text-gray-500">{selected.handle}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={9} /> {selected.location}</div>
                </div>
              </div>

              <p className="text-xs text-gray-400">{selected.bio}</p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Seguidores', value: formatK(selected.followers) },
                  { label: 'Engagement', value: `${selected.engagement}%` },
                  { label: 'Avg views', value: formatK(selected.avgViews) },
                  { label: 'Tarifa est.', value: `$${selected.rate}` },
                ].map(stat => (
                  <div key={stat.label} className="bg-[#0d0d1a] rounded-lg p-2.5 text-center">
                    <div className="text-sm font-bold text-white">{stat.value}</div>
                    <div className="text-[10px] text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <button className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <ExternalLink size={13} /> Ver perfil
                </button>
                <button className="w-full py-2 rounded-lg border border-[#1a1a2e] text-gray-400 hover:text-gray-200 text-sm transition-colors">
                  Contactar
                </button>
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
    </div>
  )
}
