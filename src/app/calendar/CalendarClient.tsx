'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Flame,
  Edit2, Trash2, CheckCircle2, Clock, AlertCircle, Lightbulb,
  BarChart2, Grid3X3, List
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, isSameDay, addMonths, subMonths, getDay
} from 'date-fns'
import { es } from 'date-fns/locale'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input, { Textarea, Select } from '@/components/ui/Input'
import { cn, getPlatformEmoji } from '@/lib/utils'

const postSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  platform: z.string(),
  type: z.string(),
  status: z.string(),
  scheduledAt: z.string().optional(),
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  hookText: z.string().optional(),
  notes: z.string().optional(),
})

type PostFormData = z.infer<typeof postSchema>

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  idea: { label: 'Idea', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', icon: Lightbulb },
  draft: { label: 'Borrador', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Edit2 },
  ready: { label: 'Listo', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: CheckCircle2 },
  scheduled: { label: 'Programado', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', icon: Clock },
  published: { label: 'Publicado', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  archived: { label: 'Archivado', color: 'text-gray-600', bg: 'bg-gray-600/10 border-gray-600/20', icon: AlertCircle },
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'border-l-pink-500',
  tiktok: 'border-l-cyan-400',
  youtube: 'border-l-red-500',
  twitter: 'border-l-sky-400',
  linkedin: 'border-l-blue-600',
}

const CONTENT_TYPES = [
  { value: 'reel', label: 'Reel / Short' },
  { value: 'post', label: 'Post / Imagen' },
  { value: 'carousel', label: 'Carrusel' },
  { value: 'story', label: 'Story' },
  { value: 'video', label: 'Video largo' },
  { value: 'thread', label: 'Thread / Hilo' },
  { value: 'short', label: 'YouTube Short' },
  { value: 'live', label: 'Live / En vivo' },
]

interface CalendarClientProps {
  posts: any[]
  userId: string
}

export default function CalendarClient({ posts: initialPosts, userId }: CalendarClientProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editPost, setEditPost] = useState<any>(null)
  const [deletePost, setDeletePost] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlatform, setFilterPlatform] = useState('all')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: { platform: 'instagram', type: 'reel', status: 'idea' },
  })

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart) // 0=Sun
  const paddingDays = Array(startDayOfWeek).fill(null)

  const getPostsForDay = (day: Date) =>
    posts.filter(p => p.scheduledAt && isSameDay(new Date(p.scheduledAt), day))

  const getPublishedForDay = (day: Date) =>
    posts.filter(p => p.publishedAt && isSameDay(new Date(p.publishedAt), day))

  const openCreate = (day?: Date) => {
    setEditPost(null)
    reset({
      platform: 'instagram', type: 'reel', status: day ? 'scheduled' : 'idea',
      scheduledAt: day ? format(day, 'yyyy-MM-dd') : '',
    })
    setShowModal(true)
  }

  const openEdit = (post: any) => {
    setEditPost(post)
    reset({
      title: post.title, platform: post.platform, type: post.type, status: post.status,
      scheduledAt: post.scheduledAt ? format(new Date(post.scheduledAt), "yyyy-MM-dd'T'HH:mm") : '',
      caption: post.caption || '', hashtags: post.hashtags || '',
      hookText: post.hookText || '', notes: post.notes || '',
    })
    setShowModal(true)
  }

  const onSubmit = async (data: PostFormData) => {
    setLoading(true)
    try {
      const method = editPost ? 'PUT' : 'POST'
      const url = editPost ? `/api/content/${editPost.id}` : '/api/content'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId }),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editPost) setPosts(posts.map(p => p.id === editPost.id ? saved : p))
        else setPosts([saved, ...posts])
        setShowModal(false)
      }
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!deletePost) return
    setLoading(true)
    try {
      const res = await fetch(`/api/content/${deletePost.id}`, { method: 'DELETE' })
      if (res.ok) { setPosts(posts.filter(p => p.id !== deletePost.id)); setDeletePost(null) }
    } finally { setLoading(false) }
  }

  // Filtered posts for list view
  const filteredPosts = posts.filter(p =>
    (filterStatus === 'all' || p.status === filterStatus) &&
    (filterPlatform === 'all' || p.platform === filterPlatform)
  )

  // Stats
  const scheduled = posts.filter(p => p.status === 'scheduled').length
  const published = posts.filter(p => p.status === 'published').length
  const ideas = posts.filter(p => p.status === 'idea').length
  const avgViralScore = posts.filter(p => p.viralScore).reduce((s, p) => s + p.viralScore, 0) / (posts.filter(p => p.viralScore).length || 1)

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Programados', value: scheduled, icon: Clock, color: 'text-violet-400' },
          { label: 'Publicados', value: published, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Ideas pendientes', value: ideas, icon: Lightbulb, color: 'text-amber-400' },
          { label: 'Score viral prom.', value: `${Math.round(avgViralScore)}/100`, icon: Flame, color: 'text-orange-400' },
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

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-bold text-white capitalize min-w-36 text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded hover:bg-violet-500/5 transition-all"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('month')} className={cn('p-1.5 rounded-lg transition-all', viewMode === 'month' ? 'bg-violet-600/20 text-violet-400' : 'text-gray-500 hover:text-gray-300')}>
            <Grid3X3 size={15} />
          </button>
          <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-violet-600/20 text-violet-400' : 'text-gray-500 hover:text-gray-300')}>
            <List size={15} />
          </button>
        </div>

        <Button onClick={() => openCreate()} icon={<Plus size={14} />} size="sm">
          Nuevo Post
        </Button>
      </div>

      {/* Month Calendar */}
      {viewMode === 'month' && (
        <Card className="overflow-hidden p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#1e1e35]">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {/* Padding days */}
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} className="min-h-24 border-b border-r border-[#1a1a2e] bg-[#09090f]/50" />
            ))}

            {/* Actual days */}
            {days.map((day) => {
              const dayPosts = getPostsForDay(day)
              const publishedPosts = getPublishedForDay(day)
              const allDayPosts = [...publishedPosts, ...dayPosts]
              const isCurrentDay = isToday(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-24 border-b border-r border-[#1a1a2e] p-1.5 cursor-pointer group transition-colors',
                    !isCurrentMonth && 'opacity-40',
                    isCurrentDay && 'bg-violet-950/20',
                    'hover:bg-white/2'
                  )}
                  onClick={() => openCreate(day)}
                >
                  <div className={cn(
                    'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                    isCurrentDay ? 'bg-violet-600 text-white' : 'text-gray-500'
                  )}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-0.5">
                    {allDayPosts.slice(0, 3).map((post) => {
                      const statusConf = STATUS_CONFIG[post.status]
                      return (
                        <div
                          key={post.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(post) }}
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded border-l-2 truncate cursor-pointer hover:brightness-110 transition-all',
                            PLATFORM_COLORS[post.platform] || 'border-l-gray-500',
                            statusConf?.bg
                          )}
                        >
                          <span className={statusConf?.color}>{getPlatformEmoji(post.platform)} {post.title}</span>
                        </div>
                      )
                    })}
                    {allDayPosts.length > 3 && (
                      <div className="text-[10px] text-gray-600 pl-1">+{allDayPosts.length - 3} más</div>
                    )}
                    {allDayPosts.length === 0 && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-[10px] text-gray-600 flex items-center gap-1">
                          <Plus size={9} /> Agregar
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
              <button
                key={key}
                onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-lg border transition-all',
                  filterStatus === key ? conf.bg + ' ' + conf.color : 'border-[#1e1e35] text-gray-500 hover:text-gray-300'
                )}
              >
                {conf.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredPosts.map((post) => {
              const statusConf = STATUS_CONFIG[post.status]
              const StatusIcon = statusConf?.icon || Clock
              return (
                <Card key={post.id} hover className={cn('border-l-2', PLATFORM_COLORS[post.platform] || 'border-l-gray-600')}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getPlatformEmoji(post.platform)}</span>
                      <div>
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', statusConf?.bg, statusConf?.color)}>
                          {statusConf?.label}
                        </span>
                      </div>
                    </div>
                    {post.viralScore && (
                      <div className={cn(
                        'text-xs font-bold px-1.5 py-0.5 rounded',
                        post.viralScore >= 80 ? 'text-orange-400 bg-orange-400/10' :
                        post.viralScore >= 65 ? 'text-emerald-400 bg-emerald-400/10' :
                        'text-gray-400 bg-gray-400/10'
                      )}>
                        🔥 {Math.round(post.viralScore)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{post.title}</h3>
                  <div className="text-[11px] text-gray-500 capitalize mb-2">{post.type} · {post.platform}</div>
                  {(post.scheduledAt || post.publishedAt) && (
                    <div className="text-[10px] text-gray-600 flex items-center gap-1">
                      <Clock size={9} />
                      {format(new Date(post.scheduledAt || post.publishedAt), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#1e1e35]">
                    <button onClick={() => openEdit(post)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-400 transition-colors">
                      <Edit2 size={11} /> Editar
                    </button>
                    <button onClick={() => setDeletePost(post)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors ml-auto">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editPost ? 'Editar Post' : 'Nuevo Post'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Título del contenido" placeholder="Ej: Reel sobre los 5 errores más comunes en Instagram" error={errors.title?.message} {...register('title')} />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Plataforma" options={[
              { value: 'instagram', label: 'Instagram' }, { value: 'tiktok', label: 'TikTok' },
              { value: 'youtube', label: 'YouTube' }, { value: 'twitter', label: 'Twitter/X' },
              { value: 'linkedin', label: 'LinkedIn' },
            ]} {...register('platform')} />
            <Select label="Tipo" options={CONTENT_TYPES} {...register('type')} />
            <Select label="Estado" options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))} {...register('status')} />
          </div>
          <Input label="Fecha y hora de publicación" type="datetime-local" {...register('scheduledAt')} />
          <Input label="Hook (primera frase clave)" placeholder="Lo que nadie te dice sobre..." {...register('hookText')} />
          <Textarea label="Caption / Guión" placeholder="El contenido principal del post..." rows={3} {...register('caption')} />
          <Input label="Hashtags" placeholder="#marketing #redessociales #tips" {...register('hashtags')} />
          <Textarea label="Notas" placeholder="Ideas, referencias, recordatorios..." rows={2} {...register('notes')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading}>{editPost ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deletePost} onClose={() => setDeletePost(null)} title="Eliminar Post" size="sm">
        <p className="text-sm text-gray-400 mb-4">¿Eliminar <strong className="text-white">{deletePost?.title}</strong>?</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeletePost(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </>
  )
}
