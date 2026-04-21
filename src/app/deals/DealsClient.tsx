'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Handshake, Plus, DollarSign, TrendingUp, Edit2, Trash2,
  ChevronRight, Mail, Phone, Calendar, Tag, AlertCircle, Check,
  MessageSquare, FileText, Zap, Clock, Star, Download
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input, { Textarea, Select } from '@/components/ui/Input'
import { formatCurrency, formatNumber, getPlatformEmoji } from '@/lib/utils'
import { cn } from '@/lib/utils'

const dealSchema = z.object({
  brand: z.string().min(2, 'Mínimo 2 caracteres'),
  contact: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  platform: z.string(),
  type: z.string(),
  stage: z.string(),
  value: z.coerce.number().min(0),
  commissionPct: z.coerce.number().min(0).max(100).optional(),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  deliverables: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
  niche: z.string().optional(),
})

type DealFormData = z.infer<typeof dealSchema>

const STAGES = [
  { id: 'outreach', label: 'Outreach', color: 'bg-gray-500/10 border-gray-500/20', textColor: 'text-gray-400', icon: MessageSquare, desc: 'Primer contacto enviado' },
  { id: 'negotiation', label: 'Negociación', color: 'bg-amber-500/10 border-amber-500/20', textColor: 'text-amber-400', icon: MessageSquare, desc: 'Discutiendo términos y precio' },
  { id: 'contract', label: 'Contrato', color: 'bg-blue-500/10 border-blue-500/20', textColor: 'text-blue-400', icon: FileText, desc: 'Firmando acuerdo' },
  { id: 'active', label: 'Activo', color: 'bg-violet-500/10 border-violet-500/20', textColor: 'text-violet-400', icon: Zap, desc: 'Creando contenido' },
  { id: 'delivered', label: 'Entregado', color: 'bg-cyan-500/10 border-cyan-500/20', textColor: 'text-cyan-400', icon: Check, desc: 'Contenido publicado' },
  { id: 'completed', label: 'Completado', color: 'bg-emerald-500/10 border-emerald-500/20', textColor: 'text-emerald-400', icon: Star, desc: 'Pago recibido' },
  { id: 'declined', label: 'Rechazado', color: 'bg-red-500/10 border-red-500/20', textColor: 'text-red-400', icon: AlertCircle, desc: 'No se concretó' },
]

const DEAL_TYPES: Record<string, string> = {
  sponsored_post: 'Post patrocinado',
  video: 'Video patrocinado',
  story: 'Stories',
  reel: 'Reel/Short',
  series: 'Serie de contenido',
  ambassador: 'Brand Ambassador',
  affiliate: 'Afiliado',
  ugc: 'UGC (sin publicar)',
}

interface DealsClientProps {
  deals: any[]
  userId: string
}

function DealCard({ deal, onEdit, onDelete, onStageChange, stages }: {
  deal: any
  onEdit: (d: any) => void
  onDelete: (d: any) => void
  onStageChange: (d: any, stage: string) => void
  stages: typeof STAGES
}) {
  const stage = stages.find(s => s.id === deal.stage)
  const StageIcon = stage?.icon || Handshake
  const isCompleted = deal.stage === 'completed'
  const isDeclined = deal.stage === 'declined'

  return (
    <div className={cn(
      'p-3 rounded-xl border bg-[#13131f] hover:bg-[#16162a] transition-all group',
      stage?.color
    )}>
      {/* Brand header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm border', stage?.color)}>
            {getPlatformEmoji(deal.platform)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{deal.brand}</div>
            <div className="text-[10px] text-gray-500 capitalize">{DEAL_TYPES[deal.type] || deal.type}</div>
          </div>
        </div>
        <div className={cn('text-sm font-bold', isCompleted ? 'text-emerald-400' : 'text-white')}>
          {deal.type === 'affiliate' && deal.commissionPct
            ? `${deal.commissionPct}%`
            : formatCurrency(deal.value)
          }
        </div>
      </div>

      {/* Description */}
      {deal.description && (
        <p className="text-[11px] text-gray-500 mb-2 line-clamp-2 leading-relaxed">{deal.description}</p>
      )}

      {/* Deliverables */}
      {deal.deliverables && (() => {
        try {
          const items = JSON.parse(deal.deliverables)
          return (
            <div className="flex flex-wrap gap-1 mb-2">
              {items.map((item: string, i: number) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{item}</span>
              ))}
            </div>
          )
        } catch { return null }
      })()}

      {/* Due date */}
      {deal.dueDate && (
        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2">
          <Clock size={10} />
          {format(new Date(deal.dueDate), "d MMM yyyy", { locale: es })}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(deal)} className="p-1 text-gray-500 hover:text-violet-400 rounded transition-colors">
          <Edit2 size={12} />
        </button>
        <button onClick={() => onDelete(deal)} className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors">
          <Trash2 size={12} />
        </button>
        {/* Quick stage advance */}
        {!isCompleted && !isDeclined && (() => {
          const currentIndex = stages.findIndex(s => s.id === deal.stage)
          const nextStage = stages[currentIndex + 1]
          if (!nextStage || nextStage.id === 'declined') return null
          return (
            <button
              onClick={() => onStageChange(deal, nextStage.id)}
              className="ml-auto flex items-center gap-1 text-[10px] text-gray-500 hover:text-emerald-400 transition-colors"
            >
              → {nextStage.label} <ChevronRight size={10} />
            </button>
          )
        })()}
      </div>
    </div>
  )
}

export default function DealsClient({ deals: initialDeals, userId }: DealsClientProps) {
  const [deals, setDeals] = useState(initialDeals)
  const [showModal, setShowModal] = useState(false)
  const [editDeal, setEditDeal] = useState<any>(null)
  const [deleteDeal, setDeleteDeal] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: { platform: 'instagram', type: 'reel', stage: 'outreach', value: 0 },
  })

  const openCreate = () => {
    setEditDeal(null)
    reset({ platform: 'instagram', type: 'reel', stage: 'outreach', value: 0 })
    setShowModal(true)
  }

  const openEdit = (deal: any) => {
    setEditDeal(deal)
    reset({
      brand: deal.brand, contact: deal.contact || '', email: deal.email || '',
      phone: deal.phone || '', platform: deal.platform, type: deal.type,
      stage: deal.stage, value: deal.value, commissionPct: deal.commissionPct || 0,
      dueDate: deal.dueDate ? format(new Date(deal.dueDate), 'yyyy-MM-dd') : '',
      description: deal.description || '', deliverables: deal.deliverables || '',
      notes: deal.notes || '', tags: deal.tags || '', niche: deal.niche || '',
    })
    setShowModal(true)
  }

  const onSubmit = async (data: DealFormData) => {
    setLoading(true)
    try {
      const method = editDeal ? 'PUT' : 'POST'
      const url = editDeal ? `/api/deals/${editDeal.id}` : '/api/deals'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId }),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editDeal) setDeals(deals.map(d => d.id === editDeal.id ? saved : d))
        else setDeals([saved, ...deals])
        setShowModal(false)
      }
    } finally { setLoading(false) }
  }

  const handleStageChange = async (deal: any, stage: string) => {
    const res = await fetch(`/api/deals/${deal.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    if (res.ok) {
      const updated = await res.json()
      setDeals(deals.map(d => d.id === deal.id ? updated : d))
    }
  }

  const handleDelete = async () => {
    if (!deleteDeal) return
    setLoading(true)
    try {
      const res = await fetch(`/api/deals/${deleteDeal.id}`, { method: 'DELETE' })
      if (res.ok) { setDeals(deals.filter(d => d.id !== deleteDeal.id)); setDeleteDeal(null) }
    } finally { setLoading(false) }
  }

  // Stats
  const pipelineValue = deals.filter(d => !['completed', 'declined'].includes(d.stage)).reduce((s, d) => s + d.value, 0)
  const completedValue = deals.filter(d => d.stage === 'completed').reduce((s, d) => s + d.value, 0)
  const activeCount = deals.filter(d => d.stage === 'active').length
  const winRate = deals.length > 0
    ? (deals.filter(d => d.stage === 'completed').length / deals.filter(d => ['completed', 'declined'].includes(d.stage)).length) * 100
    : 0

  // Active stages only for kanban (exclude declined)
  const kanbanStages = STAGES.filter(s => s.id !== 'declined')

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Valor en pipeline', value: formatCurrency(pipelineValue), icon: TrendingUp, color: 'text-violet-400' },
          { label: 'Deals cerrados', value: formatCurrency(completedValue), icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Deals activos', value: activeCount, icon: Zap, color: 'text-amber-400' },
          { label: 'Win rate', value: `${Math.round(winRate)}%`, icon: Star, color: 'text-pink-400' },
        ].map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-3">
              <s.icon size={18} className={s.color} />
              <div>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('kanban')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-all', viewMode === 'kanban' ? 'bg-violet-600/20 text-violet-300' : 'text-gray-500 hover:text-gray-300')}
          >
            Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-all', viewMode === 'list' ? 'bg-violet-600/20 text-violet-300' : 'text-gray-500 hover:text-gray-300')}
          >
            Lista
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export?type=deals"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1e1e35] text-gray-400 hover:text-gray-200 border border-[#2a2a45] hover:border-gray-600 transition-all"
          >
            <Download size={13} />
            CSV
          </a>
          <Button onClick={openCreate} icon={<Plus size={14} />} size="sm">
            Nuevo Deal
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
          {kanbanStages.map((stage) => {
            const stageDeals = deals.filter(d => d.stage === stage.id)
            const stageValue = stageDeals.reduce((s, d) => s + d.value, 0)
            const StageIcon = stage.icon
            return (
              <div key={stage.id} className="min-w-48">
                {/* Column header */}
                <div className={cn('flex items-center justify-between px-3 py-2 rounded-t-lg border-b mb-2', stage.color)}>
                  <div className="flex items-center gap-1.5">
                    <StageIcon size={12} className={stage.textColor} />
                    <span className={cn('text-xs font-bold', stage.textColor)}>{stage.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {stageDeals.length > 0 ? formatCurrency(stageValue) : `${stageDeals.length}`}
                  </span>
                </div>
                {/* Cards */}
                <div className="space-y-2 min-h-20">
                  {stageDeals.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onEdit={openEdit}
                      onDelete={setDeleteDeal}
                      onStageChange={handleStageChange}
                      stages={STAGES}
                    />
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="text-center py-6">
                      <span className="text-gray-700 text-xs">Sin deals</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-[#1e1e35]">
                  <th className="pb-3 text-left font-medium">Marca</th>
                  <th className="pb-3 text-left font-medium">Tipo</th>
                  <th className="pb-3 text-left font-medium">Plataforma</th>
                  <th className="pb-3 text-left font-medium">Estado</th>
                  <th className="pb-3 text-left font-medium">Fecha límite</th>
                  <th className="pb-3 text-right font-medium">Valor</th>
                  <th className="pb-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a2e]">
                {deals.map((deal) => {
                  const stage = STAGES.find(s => s.id === deal.stage)
                  const StageIcon = stage?.icon || Handshake
                  return (
                    <tr key={deal.id} className="hover:bg-white/2 group">
                      <td className="py-3">
                        <div className="font-medium text-white">{deal.brand}</div>
                        {deal.contact && <div className="text-xs text-gray-500">{deal.contact}</div>}
                      </td>
                      <td className="py-3 text-xs text-gray-400">{DEAL_TYPES[deal.type] || deal.type}</td>
                      <td className="py-3 text-xs text-gray-400">{getPlatformEmoji(deal.platform)} {deal.platform}</td>
                      <td className="py-3">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', stage?.color, stage?.textColor)}>
                          {stage?.label}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500">
                        {deal.dueDate ? format(new Date(deal.dueDate), 'd MMM yy', { locale: es }) : '-'}
                      </td>
                      <td className="py-3 text-right font-bold text-white">{formatCurrency(deal.value)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(deal)} className="p-1 text-gray-500 hover:text-violet-400 rounded"><Edit2 size={13} /></button>
                          <button onClick={() => setDeleteDeal(deal)} className="p-1 text-gray-500 hover:text-red-400 rounded"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Declined deals summary */}
      {deals.filter(d => d.stage === 'declined').length > 0 && (
        <Card className="border-red-500/10">
          <h4 className="text-xs font-medium text-gray-500 mb-2">Deals rechazados ({deals.filter(d => d.stage === 'declined').length})</h4>
          <div className="flex flex-wrap gap-2">
            {deals.filter(d => d.stage === 'declined').map(d => (
              <span key={d.id} className="text-xs text-gray-600 px-2 py-0.5 rounded border border-red-500/10 line-through">
                {d.brand} - {formatCurrency(d.value)}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editDeal ? 'Editar Deal' : 'Nuevo Brand Deal'} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Marca / Empresa" placeholder="Nike, Sephora..." error={errors.brand?.message} {...register('brand')} />
            <Input label="Contacto (nombre)" placeholder="María García" {...register('contact')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="marketing@marca.com" {...register('email')} />
            <Input label="Teléfono / WhatsApp" placeholder="+52 55..." {...register('phone')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select label="Plataforma" options={[
              { value: 'instagram', label: 'Instagram' }, { value: 'tiktok', label: 'TikTok' },
              { value: 'youtube', label: 'YouTube' }, { value: 'twitter', label: 'Twitter/X' },
              { value: 'linkedin', label: 'LinkedIn' }, { value: 'multi', label: 'Multi-plataforma' },
            ]} {...register('platform')} />
            <Select label="Tipo de deal" options={Object.entries(DEAL_TYPES).map(([v, l]) => ({ value: v, label: l }))} {...register('type')} />
            <Select label="Estado" options={STAGES.map(s => ({ value: s.id, label: s.label }))} {...register('stage')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Valor (USD)" type="number" placeholder="0" {...register('value')} />
            <Input label="Comisión (%)" type="number" placeholder="0" {...register('commissionPct')} />
            <Input label="Fecha límite" type="date" {...register('dueDate')} />
          </div>
          <Textarea label="Descripción del deal" placeholder="Detalles del acuerdo, brief..." rows={2} {...register('description')} />
          <Input label='Deliverables (JSON: ["1 Reel", "3 Stories"])' placeholder='["1 Reel", "2 Stories", "1 Post"]' {...register('deliverables')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nicho de la marca" placeholder="moda, tecnología..." {...register('niche')} />
            <Input label="Tags" placeholder="verano,launch,collab" {...register('tags')} />
          </div>
          <Textarea label="Notas privadas" placeholder="Negociación, condiciones especiales..." rows={2} {...register('notes')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading}>{editDeal ? 'Guardar' : 'Crear Deal'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteDeal} onClose={() => setDeleteDeal(null)} title="Eliminar Deal" size="sm">
        <p className="text-sm text-gray-400 mb-4">¿Eliminar el deal con <strong className="text-white">{deleteDeal?.brand}</strong>?</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteDeal(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </>
  )
}
