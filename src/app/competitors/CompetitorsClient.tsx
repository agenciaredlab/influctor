'use client'

import { useState } from 'react'
import { Search, Plus, TrendingUp, TrendingDown, Minus, Eye, Heart, MessageCircle,
  Users, BarChart2, Trash2, Zap, AlertCircle, Pencil, Loader2, X, Check,
  Globe, Sparkles, ExternalLink, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLATFORM_ICONS_FULL: Record<string, string> = {
  instagram: '📸 Instagram', tiktok: '🎵 TikTok', youtube: '▶️ YouTube',
  linkedin: '💼 LinkedIn', twitter: '🐦 Twitter/X', facebook: '👍 Facebook',
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'text-pink-400 bg-pink-500/10',
  tiktok:    'text-cyan-400 bg-cyan-500/10',
  youtube:   'text-red-400 bg-red-500/10',
  linkedin:  'text-blue-400 bg-blue-500/10',
  twitter:   'text-sky-400 bg-sky-500/10',
}

const PLATFORM_EMOJIS: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', youtube: '▶️', linkedin: '💼', twitter: '🐦',
}

const FORMATS = ['Reels', 'Carruseles', 'Videos', 'Stories', 'Shorts', 'Posts', 'Lives']

function formatK(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

interface Competitor {
  id: string
  handle: string
  platform: string
  followers: number
  engagement: number
  postsPerWeek: number
  avgLikes: number
  avgComments: number
  topFormat: string
  niche: string
  notes: string
}

function mapFromDb(c: any): Competitor {
  return {
    id:           c.id,
    handle:       c.handle,
    platform:     c.platform,
    followers:    c.followers    ?? 0,
    engagement:   c.engagement   ?? 0,
    postsPerWeek: Number(c.postsPerWeek ?? 0),
    avgLikes:     c.avgLikes     ?? 0,
    avgComments:  c.avgComments  ?? 0,
    topFormat:    c.contentTypes ?? 'Reels',
    niche:        c.niche        ?? 'General',
    notes:        c.notes        ?? '',
  }
}

type MetricForm = {
  handle: string; platform: string; niche: string; notes: string
  followers: string; engagement: string; postsPerWeek: string
  avgLikes: string; avgComments: string; topFormat: string
}

const EMPTY_FORM: MetricForm = {
  handle: '', platform: 'instagram', niche: '', notes: '',
  followers: '', engagement: '', postsPerWeek: '', avgLikes: '', avgComments: '', topFormat: 'Reels',
}

function MetricsFields({ form, set }: { form: MetricForm; set: (k: string, v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Seguidores</label>
        <input type="number" value={form.followers} onChange={e => set('followers', e.target.value)}
          placeholder="128000"
          className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Engagement %</label>
        <input type="number" step="0.1" value={form.engagement} onChange={e => set('engagement', e.target.value)}
          placeholder="4.5"
          className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Posts/semana</label>
        <input type="number" step="0.5" value={form.postsPerWeek} onChange={e => set('postsPerWeek', e.target.value)}
          placeholder="5"
          className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Formato principal</label>
        <select value={form.topFormat} onChange={e => set('topFormat', e.target.value)}
          className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50">
          {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Avg likes/post</label>
        <input type="number" value={form.avgLikes} onChange={e => set('avgLikes', e.target.value)}
          placeholder="3200"
          className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Avg comentarios</label>
        <input type="number" value={form.avgComments} onChange={e => set('avgComments', e.target.value)}
          placeholder="120"
          className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
      </div>
    </div>
  )
}

interface ResearchProfile {
  platform: string
  handle: string
  profileUrl: string
  estimatedFollowers: number | null
  followersNote: string | null
  realFollowers: number | null
  realFans: number | null
  dataSource: string | null
}

interface ResearchResult {
  found: boolean
  companyName?: string
  website?: string | null
  description?: string | null
  profiles?: ResearchProfile[]
}

interface Props { initialCompetitors: any[]; plan: string }

export default function CompetitorsClient({ initialCompetitors, plan }: Props) {
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors.map(mapFromDb))
  const canUseAI = plan === 'creator' || plan === 'pro'
  const [showAdd, setShowAdd]         = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [selected, setSelected]       = useState<Competitor | null>(null)
  const [search, setSearch]           = useState('')
  const [form, setForm]               = useState<MetricForm>(EMPTY_FORM)
  const [editForm, setEditForm]       = useState<MetricForm>(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  // Research state
  const [researchQuery, setResearchQuery] = useState('')
  const [researching, setResearching]     = useState(false)
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null)
  const [researchError, setResearchError]   = useState('')

  async function handleResearch(e: React.FormEvent) {
    e.preventDefault()
    if (!researchQuery.trim()) return
    setResearching(true)
    setResearchResult(null)
    setResearchError('')
    try {
      const res = await fetch('/api/competitors/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: researchQuery }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResearchResult(data)
    } catch (err: any) {
      setResearchError(err.message)
    }
    setResearching(false)
  }

  // Pre-fill the manual form with a found profile (for further editing)
  function selectProfile(profile: ResearchProfile, company: ResearchResult) {
    const followers = profile.realFollowers ?? profile.estimatedFollowers ?? 0
    const platform  = profile.platform === 'facebook' ? 'instagram' : profile.platform
    const noteStr   = `Fuente: IA${profile.dataSource === 'facebook_graph_api' ? ' + Facebook Graph API' : ''}${profile.followersNote ? `. ${profile.followersNote}` : ''}`
    setForm({
      handle: profile.handle || '', platform, niche: '', notes: noteStr,
      followers: String(followers), engagement: '', postsPerWeek: '',
      avgLikes: '', avgComments: '', topFormat: 'Reels',
    })
    setResearchResult(null)
    setResearchQuery('')
  }

  // Save or update a competitor directly from research results
  async function saveFromResearch(profile: ResearchProfile, company: ResearchResult) {
    const handle   = profile.handle || ''
    const platform = profile.platform === 'facebook' ? 'instagram' : profile.platform
    const followers = profile.realFollowers ?? profile.estimatedFollowers ?? 0
    const noteStr   = `Fuente: IA${profile.dataSource === 'facebook_graph_api' ? ' + Facebook Graph API' : ''}${profile.followersNote ? `. ${profile.followersNote}` : ''}`

    // Check if competitor already exists (same handle + platform)
    const existing = competitors.find(
      c => c.handle.toLowerCase() === handle.toLowerCase() && c.platform === platform
    )

    if (existing) {
      // UPDATE existing competitor metrics
      setSaving(true)
      try {
        const res = await fetch(`/api/competitors/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followers, notes: noteStr }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = { ...existing, followers, notes: noteStr }
        setCompetitors(prev => prev.map(c => c.id === existing.id ? updated : c))
        if (selected?.id === existing.id) setSelected(updated)
        setResearchResult(null)
        setResearchQuery('')
        setShowAdd(false)
      } catch (err: any) { setResearchError(err.message) }
      setSaving(false)
      return
    }

    // CREATE new competitor
    setSaving(true)
    try {
      const payload = {
        handle: handle.startsWith('@') ? handle : `@${handle}`,
        platform, niche: company.companyName ?? '', notes: noteStr,
        followers, engagement: 0, postsPerWeek: 0,
        avgLikes: 0, avgComments: 0, topFormat: 'Reels',
      }
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCompetitors(prev => [mapFromDb(json.competitor), ...prev])
      setResearchResult(null)
      setResearchQuery('')
      setShowAdd(false)
    } catch (err: any) { setResearchError(err.message) }
    setSaving(false)
  }

  const filtered = competitors.filter(c =>
    c.handle.toLowerCase().includes(search.toLowerCase()) ||
    c.niche.toLowerCase().includes(search.toLowerCase())
  )

  function setF(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }
  function setE(key: string, val: string) { setEditForm(f => ({ ...f, [key]: val })) }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.handle.trim()) return
    setSaving(true); setError('')
    const payload = {
      handle:       form.handle.startsWith('@') ? form.handle : `@${form.handle}`,
      platform:     form.platform,
      niche:        form.niche,
      notes:        form.notes,
      followers:    Number(form.followers)    || 0,
      engagement:   Number(form.engagement)   || 0,
      postsPerWeek: Number(form.postsPerWeek) || 0,
      avgLikes:     Number(form.avgLikes)     || 0,
      avgComments:  Number(form.avgComments)  || 0,
      topFormat:    form.topFormat,
    }
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCompetitors(prev => [mapFromDb(json.competitor), ...prev])
      setForm(EMPTY_FORM); setShowAdd(false)
    } catch (err: any) { setError(err.message) }
    setSaving(false)
  }

  function startEdit(comp: Competitor) {
    setEditingId(comp.id)
    setEditForm({
      handle: comp.handle, platform: comp.platform,
      niche: comp.niche, notes: comp.notes,
      followers: String(comp.followers), engagement: String(comp.engagement),
      postsPerWeek: String(comp.postsPerWeek), avgLikes: String(comp.avgLikes),
      avgComments: String(comp.avgComments), topFormat: comp.topFormat,
    })
  }

  async function handleEdit(id: string) {
    setSaving(true); setError('')
    const payload = {
      niche:        editForm.niche,
      notes:        editForm.notes,
      followers:    Number(editForm.followers)    || 0,
      engagement:   Number(editForm.engagement)   || 0,
      postsPerWeek: Number(editForm.postsPerWeek) || 0,
      avgLikes:     Number(editForm.avgLikes)     || 0,
      avgComments:  Number(editForm.avgComments)  || 0,
      topFormat:    editForm.topFormat,
    }
    try {
      const res = await fetch(`/api/competitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const updated: Competitor = {
        id,
        handle:       editForm.handle,
        platform:     editForm.platform,
        niche:        editForm.niche || 'General',
        notes:        editForm.notes,
        followers:    Number(editForm.followers)    || 0,
        engagement:   Number(editForm.engagement)   || 0,
        postsPerWeek: Number(editForm.postsPerWeek) || 0,
        avgLikes:     Number(editForm.avgLikes)     || 0,
        avgComments:  Number(editForm.avgComments)  || 0,
        topFormat:    editForm.topFormat,
      }
      setCompetitors(prev => prev.map(c => c.id === id ? updated : c))
      if (selected?.id === id) setSelected(updated)
      setEditingId(null)
    } catch (err: any) { setError(err.message) }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setCompetitors(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
    try { await fetch(`/api/competitors/${id}`, { method: 'DELETE' }) } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar competidor..."
            className="w-full pl-9 pr-4 py-2 bg-[#13131f] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
        </div>
        <button onClick={() => { setShowAdd(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={14} /> Agregar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              {competitors.length === 0 ? (
                <>
                  <p className="text-sm font-medium text-gray-500 mb-1">No hay competidores todavía</p>
                  <p className="text-xs text-gray-600">Agrega a un competidor para empezar a analizar su estrategia</p>
                </>
              ) : (
                <p className="text-sm">No hay competidores que coincidan con "{search}"</p>
              )}
            </div>
          )}

          {filtered.map(comp => (
            <div key={comp.id}
              onClick={() => { if (editingId !== comp.id) setSelected(comp) }}
              className={cn(
                'bg-[#13131f] border rounded-xl p-4 transition-all',
                editingId === comp.id ? 'border-violet-500/40 cursor-default' :
                  'cursor-pointer hover:border-violet-500/30',
                selected?.id === comp.id && editingId !== comp.id ? 'border-violet-500/40 shadow-lg shadow-violet-900/10' : 'border-[#1a1a2e]'
              )}
            >
              {editingId === comp.id ? (
                /* ── Inline edit form ── */
                <div className="space-y-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{comp.handle}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)}
                        className="p-1.5 rounded text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors">
                        <X size={13} />
                      </button>
                      <button onClick={() => handleEdit(comp.id)} disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors disabled:opacity-50">
                        {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                        Guardar
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Nicho</label>
                      <input value={editForm.niche} onChange={e => setE('niche', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-xs text-gray-200 focus:outline-none focus:border-violet-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Seguidores</label>
                      <input type="number" value={editForm.followers} onChange={e => setE('followers', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-xs text-gray-200 focus:outline-none focus:border-violet-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Engagement %</label>
                      <input type="number" step="0.1" value={editForm.engagement} onChange={e => setE('engagement', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-xs text-gray-200 focus:outline-none focus:border-violet-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Posts/semana</label>
                      <input type="number" step="0.5" value={editForm.postsPerWeek} onChange={e => setE('postsPerWeek', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-xs text-gray-200 focus:outline-none focus:border-violet-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Avg likes</label>
                      <input type="number" value={editForm.avgLikes} onChange={e => setE('avgLikes', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-xs text-gray-200 focus:outline-none focus:border-violet-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Avg comentarios</label>
                      <input type="number" value={editForm.avgComments} onChange={e => setE('avgComments', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-xs text-gray-200 focus:outline-none focus:border-violet-500/50" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Formato principal</label>
                      <select value={editForm.topFormat} onChange={e => setE('topFormat', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-xs text-gray-200 focus:outline-none focus:border-violet-500/50">
                        {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Notas</label>
                      <textarea value={editForm.notes} onChange={e => setE('notes', e.target.value)} rows={2}
                        className="w-full px-2.5 py-1.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-xs text-gray-200 focus:outline-none focus:border-violet-500/50 resize-none" />
                    </div>
                  </div>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                </div>
              ) : (
                /* ── Normal card view ── */
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg', PLATFORM_COLORS[comp.platform] || 'bg-gray-700')}>
                        {PLATFORM_EMOJIS[comp.platform] || '🌐'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{comp.handle}</span>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium capitalize', PLATFORM_COLORS[comp.platform])}>
                            {comp.platform}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">{comp.niche}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Users size={10} /> {formatK(comp.followers)}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Zap size={10} /> {comp.engagement}% eng
                          </span>
                          <span className="text-xs text-gray-500">{comp.postsPerWeek}x/sem</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={e => { e.stopPropagation(); startEdit(comp) }}
                        className="p-1.5 rounded text-gray-600 hover:text-violet-400 hover:bg-violet-500/10 transition-colors">
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(comp.id) }}
                        className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1a1a2e]">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Heart size={10} className="text-pink-400" />
                      {comp.avgLikes > 0 ? `${formatK(comp.avgLikes)} avg` : '—'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MessageCircle size={10} className="text-blue-400" />
                      {comp.avgComments > 0 ? `${formatK(comp.avgComments)} avg` : '—'}
                    </div>
                    <div className="text-xs text-gray-500">📋 {comp.topFormat}</div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selected && editingId !== selected.id ? (
            <>
              <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white text-sm">{selected.handle}</h3>
                  <button onClick={() => startEdit(selected)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-400 transition-colors">
                    <Pencil size={11} /> Editar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Seguidores',  value: selected.followers > 0 ? formatK(selected.followers) : '—',       icon: Users,     color: 'text-violet-400' },
                    { label: 'Engagement',  value: selected.engagement > 0 ? `${selected.engagement}%` : '—',        icon: Zap,       color: 'text-amber-400' },
                    { label: 'Posts/sem',   value: selected.postsPerWeek > 0 ? String(selected.postsPerWeek) : '—',  icon: BarChart2, color: 'text-blue-400' },
                    { label: 'Avg Likes',   value: selected.avgLikes > 0 ? formatK(selected.avgLikes) : '—',         icon: Heart,     color: 'text-pink-400' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#0d0d1a] rounded-lg p-3">
                      <stat.icon size={14} className={cn('mb-1', stat.color)} />
                      <div className="text-sm font-bold text-white">{stat.value}</div>
                      <div className="text-[10px] text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <AlertCircle size={13} className="text-amber-400" />
                  Insights & Gaps
                </h3>
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span>Formato principal: <strong className="text-gray-200">{selected.topFormat}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">→</span>
                    <span>
                      {selected.engagement === 0 ? 'Sin datos de engagement — agrégalos con Editar' :
                        selected.engagement > 5 ? 'Engagement alto — copia su estrategia de interacción' :
                        selected.engagement > 2 ? 'Engagement medio — oportunidad de superar con mejor CTA' :
                        'Engagement bajo — la audiencia no está muy activa'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">★</span>
                    <span>
                      {selected.postsPerWeek === 0 ? 'Sin datos de frecuencia — agrégalos con Editar' :
                        selected.postsPerWeek >= 7 ? 'Publica muy seguido — consistencia como ventaja' :
                        selected.postsPerWeek >= 4 ? 'Frecuencia consistente — difícil superar sin mayor calidad' :
                        'Publica poco — puedes ganar terreno publicando más'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5">→</span>
                    <span>
                      {selected.followers === 0 ? 'Sin datos de seguidores — agrégalos con Editar' :
                        selected.followers > 100_000
                          ? `${formatK(selected.followers)} seguidores — cuenta establecida, enfócate en diferenciarte`
                          : `${formatK(selected.followers)} seguidores — perfil en crecimiento, buena oportunidad`}
                    </span>
                  </div>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
                  <h3 className="font-semibold text-white text-sm mb-2">Notas</h3>
                  <p className="text-xs text-gray-400">{selected.notes}</p>
                </div>
              )}
            </>
          ) : !selected ? (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-6 text-center">
              <Eye size={28} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-500">Selecciona un competidor para ver su análisis</p>
            </div>
          ) : null}

          <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/10 border border-violet-500/20 rounded-xl p-4">
            <h3 className="font-semibold text-violet-300 text-sm mb-3 flex items-center gap-2">
              <TrendingUp size={13} /> Estrategia Anti-Competencia
            </h3>
            <div className="space-y-1.5 text-xs text-gray-400">
              <p>• Busca los temas que <em className="text-gray-300">no cubren</em> y créalos tú</p>
              <p>• Responde a sus comentarios más populares</p>
              <p>• Publica cuando ellos no publican</p>
              <p>• Mejora su contenido con más calidad o detalle</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-white">Agregar Competidor</h2>
              <button onClick={() => { setShowAdd(false); setError(''); setResearchResult(null); setResearchQuery('') }} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Busca la empresa con IA o ingresa los datos manualmente</p>

            {/* ── AI Research panel ── */}
            <div className="mb-5 p-3 bg-violet-900/10 border border-violet-500/20 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-violet-400" />
                  <span className="text-xs font-medium text-violet-300">Buscar con IA</span>
                </div>
                {!canUseAI && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
                    Creator+
                  </span>
                )}
              </div>

              {!canUseAI ? (
                <div className="text-center py-3">
                  <p className="text-xs text-gray-500 mb-2">Búsqueda IA disponible en plan Creator o superior</p>
                  <a href="/pricing" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                    Ver planes →
                  </a>
                </div>
              ) : (
                <>
                  <form onSubmit={handleResearch} className="flex gap-2">
                    <input
                      value={researchQuery}
                      onChange={e => setResearchQuery(e.target.value)}
                      placeholder="Nike, Apple, Zara, tudominio.com..."
                      className="flex-1 px-3 py-2 bg-[#0d0d1a] border border-violet-500/20 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                    />
                    <button type="submit" disabled={researching || !researchQuery.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors disabled:opacity-50">
                      {researching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                      {researching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </form>

                  {researchError && (
                    <p className="text-xs text-red-400 mt-2">{researchError}</p>
                  )}

                  {/* Research results */}
                  {researchResult && (
                    <div className="mt-3 space-y-2">
                      {!researchResult.found ? (
                        <p className="text-xs text-gray-500">No se encontró información sobre "{researchQuery}"</p>
                      ) : (
                        <>
                          <div className="flex items-start gap-2 pb-2 border-b border-violet-500/10">
                            <Globe size={12} className="text-violet-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-white">{researchResult.companyName}</span>
                              {researchResult.website && (
                                <span className="text-[10px] text-gray-500 ml-2">{researchResult.website}</span>
                              )}
                              {researchResult.description && (
                                <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{researchResult.description}</p>
                              )}
                            </div>
                          </div>

                          <p className="text-[10px] text-violet-400 font-medium">Perfiles encontrados:</p>

                          {(researchResult.profiles ?? []).map((p, i) => {
                            const followers = p.realFollowers ?? p.estimatedFollowers
                            const isReal    = p.dataSource === 'facebook_graph_api'
                            const exists    = competitors.find(
                              c => c.handle.toLowerCase() === (p.handle || '').toLowerCase()
                                && c.platform === (p.platform === 'facebook' ? 'instagram' : p.platform)
                            )
                            return (
                              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0d0d1a] border border-[#1a1a2e]">
                                <span className="text-sm flex-shrink-0">{PLATFORM_ICONS_FULL[p.platform]?.split(' ')[0] ?? '🌐'}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs text-gray-200">{p.handle}</span>
                                    {isReal && (
                                      <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">REAL</span>
                                    )}
                                    {exists && (
                                      <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">Ya guardado</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-600">
                                    {PLATFORM_ICONS_FULL[p.platform]?.split(' ').slice(1).join(' ')}
                                    {followers != null && (
                                      <span className={cn('ml-2', isReal ? 'text-emerald-400' : 'text-gray-500')}>
                                        {formatK(followers)} seg.{!isReal && ' (est.)'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  {/* Edit before saving */}
                                  <button onClick={() => selectProfile(p, researchResult)}
                                    title="Editar antes de guardar"
                                    className="p-1.5 rounded text-gray-600 hover:text-violet-400 hover:bg-violet-500/10 transition-colors">
                                    <Pencil size={11} />
                                  </button>
                                  {/* Save / Update directly */}
                                  <button
                                    onClick={() => saveFromResearch(p, researchResult)}
                                    disabled={saving}
                                    className={cn(
                                      'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-50',
                                      exists
                                        ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20'
                                        : 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/20'
                                    )}
                                  >
                                    {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                    {exists ? 'Actualizar' : 'Guardar'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}

                          {(researchResult.profiles ?? []).length === 0 && (
                            <p className="text-xs text-gray-500">No se encontraron perfiles sociales para esta empresa</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                <AlertCircle size={12} /> {error}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Handle / Usuario *</label>
                  <input required value={form.handle} onChange={e => setF('handle', e.target.value)}
                    placeholder="@usuario"
                    className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Plataforma</label>
                  <select value={form.platform} onChange={e => setF('platform', e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50">
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">Twitter/X</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Nicho</label>
                  <input value={form.niche} onChange={e => setF('niche', e.target.value)}
                    placeholder="ej: Fitness, Tech..."
                    className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
                </div>
              </div>

              <div className="border-t border-[#1a1a2e] pt-3">
                <p className="text-xs text-gray-500 mb-3">
                  Métricas <span className="text-gray-600">(opcionales — puedes editarlas después)</span>
                </p>
                <MetricsFields form={form} set={setF} />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notas</label>
                <textarea value={form.notes} onChange={e => setF('notes', e.target.value)}
                  placeholder="Qué hace bien, estrategia, horarios de publicación..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); setError('') }}
                  className="flex-1 py-2 rounded-lg border border-[#1a1a2e] text-sm text-gray-400 hover:text-gray-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : <><Plus size={13} /> Agregar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
