'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Megaphone, Plus, TrendingUp, DollarSign, Eye, Heart, MousePointer,
  Edit2, Trash2, Pause, Play, BarChart2, Users, Target, Zap,
  Search, ChevronDown, ChevronUp, Download
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import Modal from '@/components/ui/Modal'
import Input, { Textarea, Select } from '@/components/ui/Input'
import {
  formatCurrency, formatNumber, getStatusLabel,
  getPlatformEmoji, getObjectiveLabel, calculateROI
} from '@/lib/utils'
import type { Campaign } from '@/types'

const campaignSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().optional(),
  objective: z.string(),
  platform: z.string(),
  budget: z.coerce.number().min(0),
  spent: z.coerce.number().min(0),
  startDate: z.string().min(1, 'Requerido'),
  endDate: z.string().optional(),
  status: z.string(),
  impressions: z.coerce.number().min(0),
  reach: z.coerce.number().min(0),
  engagement: z.coerce.number().min(0),
  conversions: z.coerce.number().min(0),
  clicks: z.coerce.number().min(0),
  tags: z.string().optional(),
})

type CampaignFormData = z.infer<typeof campaignSchema>

const objectiveIcons: Record<string, any> = {
  awareness: Eye,
  engagement: Heart,
  conversion: MousePointer,
  growth: TrendingUp,
  monetization: DollarSign,
}

const objectiveColors: Record<string, string> = {
  awareness: 'text-blue-400 bg-blue-400/10',
  engagement: 'text-pink-400 bg-pink-400/10',
  conversion: 'text-emerald-400 bg-emerald-400/10',
  growth: 'text-violet-400 bg-violet-400/10',
  monetization: 'text-amber-400 bg-amber-400/10',
}

interface CampaignsClientProps {
  campaigns: Campaign[]
  userId: string
}

export default function CampaignsClient({ campaigns: initialCampaigns, userId }: CampaignsClientProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [showModal, setShowModal] = useState(false)
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      objective: 'growth', platform: 'instagram', status: 'draft',
      budget: 0, spent: 0, impressions: 0, reach: 0, engagement: 0, conversions: 0, clicks: 0,
    },
  })

  const openCreate = () => {
    setEditCampaign(null)
    reset({
      objective: 'growth', platform: 'instagram', status: 'draft',
      budget: 0, spent: 0, impressions: 0, reach: 0, engagement: 0, conversions: 0, clicks: 0,
      startDate: format(new Date(), 'yyyy-MM-dd'),
    })
    setShowModal(true)
  }

  const openEdit = (camp: Campaign) => {
    setEditCampaign(camp)
    reset({
      name: camp.name,
      description: camp.description || '',
      objective: camp.objective,
      platform: camp.platform,
      budget: camp.budget,
      spent: camp.spent,
      startDate: format(new Date(camp.startDate), 'yyyy-MM-dd'),
      endDate: camp.endDate ? format(new Date(camp.endDate), 'yyyy-MM-dd') : '',
      status: camp.status,
      impressions: camp.impressions,
      reach: camp.reach,
      engagement: camp.engagement,
      conversions: camp.conversions,
      clicks: camp.clicks,
      tags: camp.tags || '',
    })
    setShowModal(true)
  }

  const onSubmit = async (data: CampaignFormData) => {
    setLoading(true)
    try {
      const method = editCampaign ? 'PUT' : 'POST'
      const url = editCampaign ? `/api/campaigns/${editCampaign.id}` : '/api/campaigns'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId }),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editCampaign) {
          setCampaigns(campaigns.map(c => c.id === editCampaign.id ? saved : c))
        } else {
          setCampaigns([saved, ...campaigns])
        }
        setShowModal(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (camp: Campaign, status: string) => {
    const res = await fetch(`/api/campaigns/${camp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setCampaigns(campaigns.map(c => c.id === camp.id ? updated : c))
    }
  }

  const handleDelete = async () => {
    if (!deleteCampaign) return
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${deleteCampaign.id}`, { method: 'DELETE' })
      if (res.ok) {
        setCampaigns(campaigns.filter(c => c.id !== deleteCampaign.id))
        setDeleteCampaign(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const filtered = campaigns.filter(c => {
    const matchesFilter = filter === 'all' || c.status === filter
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Stats
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0)
  const totalReach = campaigns.reduce((s, c) => s + c.reach, 0)
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0)

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Presupuesto total', value: formatCurrency(totalBudget), icon: DollarSign, color: 'text-amber-400' },
          { label: 'Total gastado', value: formatCurrency(totalSpent), icon: TrendingUp, color: 'text-violet-400' },
          { label: 'Alcance total', value: formatNumber(totalReach), icon: Users, color: 'text-blue-400' },
          { label: 'Conversiones', value: formatNumber(totalConversions), icon: Target, color: 'text-emerald-400' },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <stat.icon size={20} className={stat.color} />
              <div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar campañas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-[#0f0f1a] border border-[#1e1e35] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'active', 'draft', 'completed', 'paused'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter === f
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-[#1e1e35]'
              }`}
            >
              {f === 'all' ? 'Todas' : getStatusLabel(f)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export?type=campaigns"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#1e1e35] text-gray-400 hover:text-gray-200 border border-[#2a2a45] hover:border-gray-600 transition-all"
          >
            <Download size={14} />
            CSV
          </a>
          <Button onClick={openCreate} icon={<Plus size={15} />}>
            Nueva Campaña
          </Button>
        </div>
      </div>

      {/* Campaigns List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Megaphone size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay campañas</p>
          <Button onClick={openCreate} className="mt-4" icon={<Plus size={15} />}>Crear campaña</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((camp) => {
            const ObjectiveIcon = objectiveIcons[camp.objective] || Zap
            const budgetPct = camp.budget > 0 ? (camp.spent / camp.budget) * 100 : 0
            const ctr = camp.impressions > 0 ? (camp.clicks / camp.impressions) * 100 : 0
            const cvr = camp.clicks > 0 ? (camp.conversions / camp.clicks) * 100 : 0
            const isExpanded = expandedId === camp.id
            const roi = calculateROI(camp.conversions * 50, camp.spent) // estimated

            return (
              <Card key={camp.id} className="overflow-hidden">
                {/* Campaign Header */}
                <div className="flex items-start gap-4">
                  {/* Objective icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${objectiveColors[camp.objective] || 'bg-gray-400/10 text-gray-400'}`}>
                    <ObjectiveIcon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">{camp.name}</h3>
                      <Badge
                        variant={
                          camp.status === 'active' ? 'success' :
                          camp.status === 'completed' ? 'info' :
                          camp.status === 'paused' ? 'warning' : 'default'
                        }
                        dot
                      >
                        {getStatusLabel(camp.status)}
                      </Badge>
                    </div>
                    {camp.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{camp.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                      <span>{getPlatformEmoji(camp.platform)} {camp.platform}</span>
                      <span>•</span>
                      <span>{getObjectiveLabel(camp.objective)}</span>
                      <span>•</span>
                      <span>{format(new Date(camp.startDate), 'd MMM', { locale: es })}{camp.endDate ? ` - ${format(new Date(camp.endDate), 'd MMM yy', { locale: es })}` : ''}</span>
                      {camp.tags && <><span>•</span><span className="text-violet-400">#{camp.tags.split(',')[0].trim()}</span></>}
                    </div>
                  </div>

                  {/* Quick metrics */}
                  <div className="hidden md:flex items-center gap-6 text-center">
                    <div>
                      <div className="text-sm font-bold text-white">{formatNumber(camp.impressions)}</div>
                      <div className="text-[10px] text-gray-500">Impresiones</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{formatNumber(camp.reach)}</div>
                      <div className="text-[10px] text-gray-500">Alcance</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-400">{formatNumber(camp.conversions)}</div>
                      <div className="text-[10px] text-gray-500">Conversiones</div>
                    </div>
                    {camp.budget > 0 && (
                      <div>
                        <div className="text-sm font-bold text-amber-400">{formatCurrency(camp.spent)}</div>
                        <div className="text-[10px] text-gray-500">/ {formatCurrency(camp.budget)}</div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : camp.id)}
                      className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      onClick={() => openEdit(camp)}
                      className="p-1.5 text-gray-500 hover:text-violet-400 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    {camp.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(camp, 'paused')}
                        className="p-1.5 text-gray-500 hover:text-amber-400 rounded-lg hover:bg-white/5 transition-colors"
                        title="Pausar"
                      >
                        <Pause size={15} />
                      </button>
                    )}
                    {(camp.status === 'paused' || camp.status === 'draft') && (
                      <button
                        onClick={() => handleStatusChange(camp, 'active')}
                        className="p-1.5 text-gray-500 hover:text-emerald-400 rounded-lg hover:bg-white/5 transition-colors"
                        title="Activar"
                      >
                        <Play size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteCampaign(camp)}
                      className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Budget progress */}
                {camp.budget > 0 && (
                  <div className="mt-3">
                    <Progress value={budgetPct} size="xs" color={budgetPct > 90 ? 'red' : budgetPct > 70 ? 'amber' : 'violet'} />
                  </div>
                )}

                {/* Expanded metrics */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#1e1e35] grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Impresiones', value: formatNumber(camp.impressions), icon: Eye, color: 'text-blue-400' },
                      { label: 'Alcance', value: formatNumber(camp.reach), icon: Users, color: 'text-violet-400' },
                      { label: 'Engagement', value: formatNumber(camp.engagement), icon: Heart, color: 'text-pink-400' },
                      { label: 'Clics', value: formatNumber(camp.clicks), icon: MousePointer, color: 'text-amber-400' },
                      { label: 'Conversiones', value: formatNumber(camp.conversions), icon: Target, color: 'text-emerald-400' },
                      { label: 'CTR', value: `${ctr.toFixed(2)}%`, icon: BarChart2, color: 'text-cyan-400' },
                      { label: 'CVR', value: `${cvr.toFixed(2)}%`, icon: Zap, color: 'text-amber-400' },
                      { label: 'Presupuesto usado', value: `${budgetPct.toFixed(0)}%`, icon: DollarSign, color: 'text-red-400' },
                    ].map((metric) => (
                      <div key={metric.label} className="bg-[#0f0f1a] rounded-lg p-3 border border-[#1a1a2e]">
                        <div className="flex items-center gap-2 mb-1">
                          <metric.icon size={13} className={metric.color} />
                          <span className="text-[10px] text-gray-500 uppercase tracking-wide">{metric.label}</span>
                        </div>
                        <div className="text-lg font-bold text-white">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editCampaign ? 'Editar Campaña' : 'Nueva Campaña'}
        description="Configura tu campaña y empieza a medir resultados"
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nombre de la campaña" placeholder="Ej: Lanzamiento Colección Verano" error={errors.name?.message} {...register('name')} />
          <Textarea label="Descripción (opcional)" placeholder="Objetivo y estrategia de la campaña..." rows={2} {...register('description')} />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Objetivo" options={[
              { value: 'awareness', label: 'Awareness' },
              { value: 'engagement', label: 'Engagement' },
              { value: 'conversion', label: 'Conversión' },
              { value: 'growth', label: 'Crecimiento' },
              { value: 'monetization', label: 'Monetización' },
            ]} {...register('objective')} />
            <Select label="Plataforma" options={[
              { value: 'instagram', label: 'Instagram' },
              { value: 'tiktok', label: 'TikTok' },
              { value: 'youtube', label: 'YouTube' },
              { value: 'twitter', label: 'Twitter/X' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'multi', label: 'Multi-plataforma' },
            ]} {...register('platform')} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select label="Estado" options={[
              { value: 'draft', label: 'Borrador' },
              { value: 'active', label: 'Activo' },
              { value: 'paused', label: 'Pausado' },
              { value: 'completed', label: 'Completado' },
            ]} {...register('status')} />
            <Input label="Presupuesto ($)" type="number" placeholder="0" {...register('budget')} />
            <Input label="Gastado ($)" type="number" placeholder="0" {...register('spent')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha inicio" type="date" {...register('startDate')} error={errors.startDate?.message} />
            <Input label="Fecha fin (opcional)" type="date" {...register('endDate')} />
          </div>

          <div className="border-t border-[#1e1e35] pt-4">
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Métricas de rendimiento</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Impresiones" type="number" placeholder="0" {...register('impressions')} />
              <Input label="Alcance" type="number" placeholder="0" {...register('reach')} />
              <Input label="Engagement" type="number" placeholder="0" {...register('engagement')} />
              <Input label="Clics" type="number" placeholder="0" {...register('clicks')} />
              <Input label="Conversiones" type="number" placeholder="0" {...register('conversions')} />
              <Input label="Tags (separados por ,)" placeholder="moda,verano,ad" {...register('tags')} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading}>{editCampaign ? 'Guardar' : 'Crear campaña'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteCampaign} onClose={() => setDeleteCampaign(null)} title="Eliminar Campaña" size="sm">
        <p className="text-sm text-gray-400 mb-4">¿Eliminar la campaña <strong className="text-white">{deleteCampaign?.name}</strong>?</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteCampaign(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </>
  )
}
