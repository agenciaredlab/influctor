'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Target, Plus, Trophy, TrendingUp, Clock, CheckCircle2,
  AlertCircle, Edit2, Trash2, Star, Flame, BarChart3,
  Filter, Search
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
  formatNumber, formatCurrency, calculateProgress,
  getStatusColor, getStatusLabel, getPriorityColor, getPriorityLabel,
  getCategoryLabel, getPlatformEmoji
} from '@/lib/utils'
import type { Goal } from '@/types'

const goalSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().optional(),
  category: z.string(),
  platform: z.string(),
  targetValue: z.coerce.number().positive('Debe ser mayor a 0'),
  currentValue: z.coerce.number().min(0),
  unit: z.string().min(1, 'Ingresa la unidad'),
  deadline: z.string().optional(),
  priority: z.string(),
  notes: z.string().optional(),
})

type GoalFormData = z.infer<typeof goalSchema>

function ScoreRing({ score }: { score: number | null | undefined }) {
  const s = score ?? 0
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (s / 100) * circumference
  const color = s >= 80 ? '#10b981' : s >= 50 ? '#7c3aed' : s >= 25 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="60" height="60" className="-rotate-90">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="#1e1e35" strokeWidth="4" />
        <circle
          cx="30" cy="30" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{Math.round(s)}%</span>
    </div>
  )
}

interface GoalsClientProps {
  goals: Goal[]
  userId: string
}

export default function GoalsClient({ goals: initialGoals, userId }: GoalsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [showModal, setShowModal] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: { category: 'followers', platform: 'instagram', priority: 'medium', currentValue: 0 },
  })

  const openCreate = () => {
    setEditGoal(null)
    reset({ category: 'followers', platform: 'instagram', priority: 'medium', currentValue: 0, unit: 'seguidores' })
    setShowModal(true)
  }

  const openEdit = (goal: Goal) => {
    setEditGoal(goal)
    reset({
      title: goal.title,
      description: goal.description || '',
      category: goal.category,
      platform: goal.platform || 'all',
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      unit: goal.unit,
      deadline: goal.deadline ? format(new Date(goal.deadline), 'yyyy-MM-dd') : '',
      priority: goal.priority,
      notes: goal.notes || '',
    })
    setShowModal(true)
  }

  const onSubmit = async (data: GoalFormData) => {
    setLoading(true)
    try {
      const method = editGoal ? 'PUT' : 'POST'
      const url = editGoal ? `/api/goals/${editGoal.id}` : '/api/goals'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId }),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editGoal) {
          setGoals(goals.map(g => g.id === editGoal.id ? saved : g))
        } else {
          setGoals([saved, ...goals])
        }
        setShowModal(false)
        reset()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteGoal) return
    setLoading(true)
    try {
      const res = await fetch(`/api/goals/${deleteGoal.id}`, { method: 'DELETE' })
      if (res.ok) {
        setGoals(goals.filter(g => g.id !== deleteGoal.id))
        setDeleteGoal(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (goal: Goal, status: string) => {
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setGoals(goals.map(g => g.id === goal.id ? updated : g))
    }
  }

  const filteredGoals = goals.filter(goal => {
    const matchesFilter = filter === 'all' || goal.status === filter || goal.priority === filter
    const matchesSearch = !search || goal.title.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Stats
  const totalGoals = goals.length
  const activeGoals = goals.filter(g => g.status === 'active').length
  const completedGoals = goals.filter(g => g.status === 'completed').length
  const avgScore = goals.filter(g => g.score != null).reduce((acc, g) => acc + (g.score || 0), 0) / (goals.filter(g => g.score != null).length || 1)

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total metas', value: totalGoals, icon: Target, color: 'text-violet-400' },
          { label: 'Activas', value: activeGoals, icon: Flame, color: 'text-amber-400' },
          { label: 'Completadas', value: completedGoals, icon: Trophy, color: 'text-emerald-400' },
          { label: 'Score promedio', value: `${Math.round(avgScore)}%`, icon: Star, color: 'text-pink-400' },
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

      {/* Filters & Search */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar metas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-[#0f0f1a] border border-[#1e1e35] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'active', 'completed', 'paused', 'high'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter === f
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-[#1e1e35]'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'high' ? 'Alta prioridad' : getStatusLabel(f)}
            </button>
          ))}
        </div>
        <Button onClick={openCreate} icon={<Plus size={15} />}>
          Nueva Meta
        </Button>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="text-center py-20">
          <Target size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay metas que mostrar</p>
          <Button onClick={openCreate} className="mt-4" icon={<Plus size={15} />}>
            Crear primera meta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => {
            const progress = calculateProgress(goal.currentValue, goal.targetValue)
            const isCompleted = goal.status === 'completed'

            return (
              <Card key={goal.id} hover className="group">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-xl mt-0.5">{getPlatformEmoji(goal.platform || 'all')}</span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white leading-tight">{goal.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge
                          variant={
                            goal.status === 'active' ? 'success' :
                            goal.status === 'completed' ? 'info' :
                            goal.status === 'paused' ? 'warning' : 'danger'
                          }
                          dot
                        >
                          {getStatusLabel(goal.status)}
                        </Badge>
                        <Badge
                          variant={
                            goal.priority === 'high' ? 'danger' :
                            goal.priority === 'medium' ? 'warning' : 'default'
                          }
                        >
                          {getPriorityLabel(goal.priority)}
                        </Badge>
                        <Badge variant="purple">{getCategoryLabel(goal.category)}</Badge>
                      </div>
                    </div>
                  </div>
                  <ScoreRing score={goal.score} />
                </div>

                {/* Description */}
                {goal.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{goal.description}</p>
                )}

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">Progreso</span>
                    <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} size="sm" />
                  <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
                    <span className="font-medium text-gray-300">
                      {goal.category === 'income' ? formatCurrency(goal.currentValue) : formatNumber(goal.currentValue)} {goal.unit}
                    </span>
                    <span>/ {goal.category === 'income' ? formatCurrency(goal.targetValue) : formatNumber(goal.targetValue)} {goal.unit}</span>
                  </div>
                </div>

                {/* Deadline */}
                {goal.deadline && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                    <Clock size={11} />
                    <span>Fecha límite: {format(new Date(goal.deadline), "d 'de' MMMM yyyy", { locale: es })}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#1e1e35] opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(goal)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-400 transition-colors"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  {goal.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(goal, 'completed')}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-400 transition-colors"
                    >
                      <CheckCircle2 size={12} /> Completar
                    </button>
                  )}
                  {goal.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(goal, 'paused')}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-amber-400 transition-colors"
                    >
                      <AlertCircle size={12} /> Pausar
                    </button>
                  )}
                  {goal.status !== 'active' && (
                    <button
                      onClick={() => handleStatusChange(goal, 'active')}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-400 transition-colors"
                    >
                      <Flame size={12} /> Activar
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => setDeleteGoal(goal)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); reset() }}
        title={editGoal ? 'Editar Meta' : 'Nueva Meta'}
        description="Define objetivos claros y medibles para tu crecimiento"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Título de la meta"
            placeholder="Ej: Llegar a 100K seguidores en Instagram"
            error={errors.title?.message}
            {...register('title')}
          />

          <Textarea
            label="Descripción (opcional)"
            placeholder="Describe el objetivo y estrategia..."
            rows={2}
            {...register('description')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoría"
              options={[
                { value: 'followers', label: 'Seguidores' },
                { value: 'engagement', label: 'Engagement' },
                { value: 'income', label: 'Ingresos' },
                { value: 'content', label: 'Contenido' },
                { value: 'views', label: 'Vistas' },
                { value: 'brand_deals', label: 'Brand Deals' },
              ]}
              {...register('category')}
            />
            <Select
              label="Plataforma"
              options={[
                { value: 'instagram', label: 'Instagram' },
                { value: 'tiktok', label: 'TikTok' },
                { value: 'youtube', label: 'YouTube' },
                { value: 'twitter', label: 'Twitter/X' },
                { value: 'linkedin', label: 'LinkedIn' },
                { value: 'all', label: 'Todas las plataformas' },
              ]}
              {...register('platform')}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Valor objetivo"
              type="number"
              placeholder="100000"
              error={errors.targetValue?.message}
              {...register('targetValue')}
            />
            <Input
              label="Valor actual"
              type="number"
              placeholder="0"
              error={errors.currentValue?.message}
              {...register('currentValue')}
            />
            <Input
              label="Unidad"
              placeholder="seguidores, %, $, posts..."
              error={errors.unit?.message}
              {...register('unit')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Prioridad"
              options={[
                { value: 'high', label: 'Alta' },
                { value: 'medium', label: 'Media' },
                { value: 'low', label: 'Baja' },
              ]}
              {...register('priority')}
            />
            <Input
              label="Fecha límite (opcional)"
              type="date"
              {...register('deadline')}
            />
          </div>

          <Textarea
            label="Notas (opcional)"
            placeholder="Estrategia, acciones clave..."
            rows={2}
            {...register('notes')}
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => { setShowModal(false); reset() }}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              {editGoal ? 'Guardar cambios' : 'Crear meta'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteGoal}
        onClose={() => setDeleteGoal(null)}
        title="Eliminar Meta"
        description="Esta acción no se puede deshacer"
        size="sm"
      >
        <p className="text-sm text-gray-400 mb-4">
          ¿Seguro que quieres eliminar la meta <strong className="text-white">{deleteGoal?.title}</strong>?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteGoal(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </>
  )
}
