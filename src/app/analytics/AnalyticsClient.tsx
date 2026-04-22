'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Edit2, Trash2,
  ArrowUpRight, ArrowDownRight, Calendar, Filter, Users, Link2Off
} from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input, { Select } from '@/components/ui/Input'
import { formatCurrency, formatNumber, getPlatformEmoji, getSourceLabel } from '@/lib/utils'

const incomeSchema = z.object({
  amount: z.coerce.number().positive('Debe ser mayor a 0'),
  source: z.string(),
  platform: z.string().optional(),
  description: z.string().optional(),
  date: z.string().min(1, 'Requerido'),
})

type IncomeFormData = z.infer<typeof incomeSchema>

const metricSchema = z.object({
  platform:   z.string().min(1, 'Requerido'),
  date:       z.string().min(1, 'Requerido'),
  followers:  z.coerce.number().int().min(0),
  following:  z.coerce.number().int().min(0).optional(),
  posts:      z.coerce.number().int().min(0).optional(),
  engagement: z.coerce.number().min(0).max(100).optional(),
  reach:      z.coerce.number().int().min(0).optional(),
  impressions:z.coerce.number().int().min(0).optional(),
  likes:      z.coerce.number().int().min(0).optional(),
  comments:   z.coerce.number().int().min(0).optional(),
  shares:     z.coerce.number().int().min(0).optional(),
})

type MetricFormData = z.infer<typeof metricSchema>

const SOURCE_COLORS: Record<string, string> = {
  brand_deal: '#7c3aed',
  affiliate: '#06b6d4',
  adsense: '#f59e0b',
  merch: '#ec4899',
  tips: '#10b981',
  consulting: '#3b82f6',
  subscription: '#8b5cf6',
  other: '#6b7280',
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#e1306c',
  tiktok: '#69c9d0',
  youtube: '#ff0000',
  twitter: '#1da1f2',
  linkedin: '#0077b5',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="font-medium" style={{ color: entry.color || entry.fill }}>
          {entry.name}: {typeof entry.value === 'number' ? (entry.value > 1000 ? formatCurrency(entry.value) : formatNumber(entry.value)) : entry.value}
        </p>
      ))}
    </div>
  )
}

interface AnalyticsClientProps {
  data: {
    user: any
    incomes: any[]
    metrics: any[]
    igAccount?: any
  }
}

export default function AnalyticsClient({ data }: AnalyticsClientProps) {
  const { incomes: initialIncomes, metrics: initialMetrics, igAccount } = data
  const [incomes, setIncomes] = useState(initialIncomes)
  const [manualMetrics, setManualMetrics] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showMetricModal, setShowMetricModal] = useState(false)
  const [editIncome, setEditIncome] = useState<any>(null)
  const [editMetric, setEditMetric] = useState<any>(null)
  const [deleteIncome, setDeleteIncome] = useState<any>(null)
  const [deleteMetric, setDeleteMetric] = useState<any>(null)
  const [activePlatform, setActivePlatform] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'income' | 'growth' | 'engagement' | 'metrics'>('income')
  const [loading, setLoading] = useState(false)
  const [metricsLoaded, setMetricsLoaded] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { source: 'brand_deal', date: format(new Date(), 'yyyy-MM-dd') },
  })

  const {
    register: registerMetric,
    handleSubmit: handleSubmitMetric,
    reset: resetMetric,
    formState: { errors: metricErrors },
  } = useForm<MetricFormData>({
    resolver: zodResolver(metricSchema),
    defaultValues: { platform: 'instagram', date: format(new Date(), 'yyyy-MM-dd'), followers: 0, engagement: 0 },
  })

  const loadManualMetrics = async () => {
    if (metricsLoaded) return
    setLoading(true)
    try {
      const res = await fetch('/api/metrics')
      if (res.ok) {
        setManualMetrics(await res.json())
        setMetricsLoaded(true)
      }
    } finally { setLoading(false) }
  }

  const openMetricCreate = () => {
    setEditMetric(null)
    resetMetric({ platform: 'instagram', date: format(new Date(), 'yyyy-MM-dd'), followers: 0, engagement: 0 })
    setShowMetricModal(true)
  }

  const openMetricEdit = (m: any) => {
    setEditMetric(m)
    resetMetric({
      platform: m.platform, date: format(new Date(m.date), 'yyyy-MM-dd'),
      followers: m.followers, following: m.following, posts: m.posts,
      engagement: m.engagement, reach: m.reach, impressions: m.impressions,
      likes: m.likes, comments: m.comments, shares: m.shares,
    })
    setShowMetricModal(true)
  }

  const onSubmitMetric = async (formData: MetricFormData) => {
    setLoading(true)
    try {
      const method = editMetric ? 'PUT' : 'POST'
      const url    = editMetric ? `/api/metrics/${editMetric.id}` : '/api/metrics'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      if (res.ok) {
        const saved = await res.json()
        if (editMetric) setManualMetrics(prev => prev.map(m => m.id === editMetric.id ? saved : m))
        else setManualMetrics(prev => [saved, ...prev])
        setShowMetricModal(false)
      }
    } finally { setLoading(false) }
  }

  const handleDeleteMetric = async () => {
    if (!deleteMetric) return
    setLoading(true)
    try {
      const res = await fetch(`/api/metrics/${deleteMetric.id}`, { method: 'DELETE' })
      if (res.ok) { setManualMetrics(prev => prev.filter(m => m.id !== deleteMetric.id)); setDeleteMetric(null) }
    } finally { setLoading(false) }
  }

  // --- Income analytics ---
  const monthlyIncome = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {}
    for (const inc of incomes) {
      const month = format(new Date(inc.date), 'MMM yy', { locale: es })
      if (!byMonth[month]) byMonth[month] = {}
      byMonth[month][inc.source] = (byMonth[month][inc.source] || 0) + inc.amount
      byMonth[month]['total'] = (byMonth[month]['total'] || 0) + inc.amount
    }
    return Object.entries(byMonth)
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6)
  }, [incomes])

  const incomeBySource = useMemo(() => {
    const by: Record<string, number> = {}
    for (const inc of incomes) {
      by[inc.source] = (by[inc.source] || 0) + inc.amount
    }
    return Object.entries(by).map(([source, value]) => ({
      name: getSourceLabel(source),
      value: Math.round(value),
      color: SOURCE_COLORS[source] || '#6b7280',
      source,
    })).sort((a, b) => b.value - a.value)
  }, [incomes])

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const thisMonthIncome = incomes.filter(i => {
    const d = new Date(i.date)
    return d >= startOfMonth(new Date()) && d <= endOfMonth(new Date())
  }).reduce((s, i) => s + i.amount, 0)
  const lastMonthIncome = incomes.filter(i => {
    const d = new Date(i.date)
    const last = subMonths(new Date(), 1)
    return d >= startOfMonth(last) && d <= endOfMonth(last)
  }).reduce((s, i) => s + i.amount, 0)
  const incomeChange = lastMonthIncome > 0 ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0

  // Use server-prefetched merged metrics (snapshots + manual) for charts
  const metrics = initialMetrics

  // --- Growth chart ---
  const growthData = useMemo(() => {
    const platformsSeen = new Set<string>()
    const byWeek: Record<string, Record<string, number>> = {}
    for (const m of metrics) {
      const week = format(new Date(m.date), 'dd MMM', { locale: es })
      if (!byWeek[week]) byWeek[week] = {}
      if (!byWeek[week][m.platform]) {
        byWeek[week][m.platform] = m.followers
        platformsSeen.add(m.platform)
      }
    }
    return { data: Object.entries(byWeek).map(([week, d]) => ({ week, ...d })), platforms: [...platformsSeen] }
  }, [metrics])

  // --- Engagement chart ---
  const engagementData = useMemo(() => {
    const byWeek: Record<string, Record<string, number>> = {}
    for (const m of metrics) {
      const week = format(new Date(m.date), 'dd MMM', { locale: es })
      if (!byWeek[week]) byWeek[week] = {}
      if (!byWeek[week][m.platform]) {
        byWeek[week][m.platform] = parseFloat(m.engagement.toFixed(2))
      }
    }
    return Object.entries(byWeek).map(([week, d]) => ({ week, ...d }))
  }, [metrics])

  const openCreate = () => {
    setEditIncome(null)
    reset({ source: 'brand_deal', date: format(new Date(), 'yyyy-MM-dd') })
    setShowModal(true)
  }

  const openEdit = (inc: any) => {
    setEditIncome(inc)
    reset({
      amount: inc.amount,
      source: inc.source,
      platform: inc.platform || '',
      description: inc.description || '',
      date: format(new Date(inc.date), 'yyyy-MM-dd'),
    })
    setShowModal(true)
  }

  const onSubmit = async (data: IncomeFormData) => {
    setLoading(true)
    try {
      const method = editIncome ? 'PUT' : 'POST'
      const url = editIncome ? `/api/income/${editIncome.id}` : '/api/income'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: data }),
      })
      if (res.ok) {
        const saved = await res.json()
        if (editIncome) {
          setIncomes(incomes.map((i: any) => i.id === editIncome.id ? saved : i))
        } else {
          setIncomes([saved, ...incomes])
        }
        setShowModal(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteIncome) return
    setLoading(true)
    try {
      const res = await fetch(`/api/income/${deleteIncome.id}`, { method: 'DELETE' })
      if (res.ok) {
        setIncomes(incomes.filter((i: any) => i.id !== deleteIncome.id))
        setDeleteIncome(null)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Income KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Ingresos este mes',
            value: formatCurrency(thisMonthIncome),
            change: incomeChange,
            icon: DollarSign,
            color: 'text-emerald-400',
          },
          {
            label: 'Mes anterior',
            value: formatCurrency(lastMonthIncome),
            icon: Calendar,
            color: 'text-gray-400',
          },
          {
            label: 'Total registrado',
            value: formatCurrency(totalIncome),
            icon: TrendingUp,
            color: 'text-violet-400',
          },
          {
            label: 'Fuentes activas',
            value: incomeBySource.length.toString(),
            icon: Filter,
            color: 'text-blue-400',
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <stat.icon size={18} className={stat.color} />
                {stat.change !== undefined && (
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stat.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(stat.change).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts tabs */}
      <div className="flex items-center gap-2 border-b border-[#1e1e35] pb-0">
        {[
          { key: 'income',     label: 'Ingresos' },
          { key: 'growth',     label: 'Crecimiento' },
          { key: 'engagement', label: 'Engagement' },
          { key: 'metrics',    label: 'Métricas manuales' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as any)
              if (tab.key === 'metrics') loadManualMetrics()
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === tab.key
                ? 'text-violet-400 border-violet-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'income' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly income stacked bar */}
          <Card className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-white mb-5">Ingresos Mensuales por Fuente</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyIncome} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
                <Tooltip content={<CustomTooltip />} />
                {['brand_deal', 'affiliate', 'adsense', 'consulting', 'merch', 'tips'].map((source) => (
                  <Bar key={source} dataKey={source} name={getSourceLabel(source)}
                    fill={SOURCE_COLORS[source]} stackId="a" radius={source === 'tips' ? [3, 3, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Pie + legend */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Distribución de Fuentes</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={incomeBySource} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                  {incomeBySource.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-2 text-xs">
                        <p style={{ color: payload[0].payload.color }} className="font-medium">{payload[0].name}</p>
                        <p className="text-white">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {incomeBySource.map((item) => (
                <div key={item.source} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-400">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300 font-medium">{formatCurrency(item.value)}</span>
                    <span className="text-gray-600">{((item.value / totalIncome) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'growth' && (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-5">Crecimiento de Seguidores por Plataforma</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={growthData.data}>
              <defs>
                {growthData.platforms.map((p) => (
                  <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PLATFORM_COLORS[p] ?? '#7c3aed'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PLATFORM_COLORS[p] ?? '#7c3aed'} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
              <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <Tooltip content={<CustomTooltip />} />
              {growthData.platforms.map((p) => (
                <Area key={p} type="monotone" dataKey={p} name={p.charAt(0).toUpperCase() + p.slice(1)}
                  stroke={PLATFORM_COLORS[p] ?? '#7c3aed'}
                  fill={`url(#grad-${p})`} strokeWidth={2} dot={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {activeTab === 'engagement' && (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-5">Tasa de Engagement por Plataforma (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
              <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              {growthData.platforms.map((p) => (
                <Line key={p} type="monotone" dataKey={p} name={p.charAt(0).toUpperCase() + p.slice(1)}
                  stroke={PLATFORM_COLORS[p] ?? '#7c3aed'} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {activeTab === 'metrics' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users size={15} className="text-violet-400" />
                Métricas Manuales
              </h3>
              {igAccount && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Link2Off size={10} /> Cuentas conectadas usan datos reales — aquí registra plataformas sin conexión OAuth.
                </p>
              )}
            </div>
            <Button onClick={openMetricCreate} icon={<Plus size={14} />} size="sm">
              Registrar
            </Button>
          </div>

          {loading && !metricsLoaded && (
            <div className="text-center py-8 text-gray-500 text-sm">Cargando métricas...</div>
          )}

          {metricsLoaded && manualMetrics.length === 0 && (
            <div className="text-center py-10">
              <Users size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">Sin métricas registradas</p>
              <p className="text-xs text-gray-600">Registra tus seguidores y engagement manualmente para ver el crecimiento en los gráficos.</p>
            </div>
          )}

          {manualMetrics.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-[#1e1e35]">
                    <th className="pb-3 text-left font-medium">Fecha</th>
                    <th className="pb-3 text-left font-medium">Plataforma</th>
                    <th className="pb-3 text-right font-medium">Seguidores</th>
                    <th className="pb-3 text-right font-medium">Engagement</th>
                    <th className="pb-3 text-right font-medium">Alcance</th>
                    <th className="pb-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a2e]">
                  {manualMetrics.map((m: any) => (
                    <tr key={m.id} className="hover:bg-white/2 group">
                      <td className="py-3 text-gray-500 text-xs">{format(new Date(m.date), 'd MMM yy', { locale: es })}</td>
                      <td className="py-3 text-xs capitalize">
                        <span className="text-base mr-1">{getPlatformEmoji(m.platform)}</span>
                        <span className="text-gray-400">{m.platform}</span>
                      </td>
                      <td className="py-3 text-right text-gray-300 font-medium text-xs">{formatNumber(m.followers)}</td>
                      <td className="py-3 text-right text-xs" style={{ color: PLATFORM_COLORS[m.platform] ?? '#a78bfa' }}>
                        {m.engagement.toFixed(2)}%
                      </td>
                      <td className="py-3 text-right text-gray-500 text-xs">{m.reach ? formatNumber(m.reach) : '-'}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openMetricEdit(m)} className="p-1 text-gray-500 hover:text-violet-400 rounded"><Edit2 size={13} /></button>
                          <button onClick={() => setDeleteMetric(m)} className="p-1 text-gray-500 hover:text-red-400 rounded"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Income Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Registro de Ingresos</h3>
          <Button onClick={openCreate} icon={<Plus size={14} />} size="sm">
            Registrar ingreso
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-[#1e1e35]">
                <th className="pb-3 text-left font-medium">Fecha</th>
                <th className="pb-3 text-left font-medium">Descripción</th>
                <th className="pb-3 text-left font-medium">Fuente</th>
                <th className="pb-3 text-left font-medium">Plataforma</th>
                <th className="pb-3 text-right font-medium">Monto</th>
                <th className="pb-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a2e]">
              {incomes.slice(0, 20).map((inc: any) => (
                <tr key={inc.id} className="hover:bg-white/2 group">
                  <td className="py-3 text-gray-500 text-xs">
                    {format(new Date(inc.date), 'd MMM yy', { locale: es })}
                  </td>
                  <td className="py-3 text-gray-300 text-xs max-w-xs truncate">
                    {inc.description || getSourceLabel(inc.source)}
                  </td>
                  <td className="py-3">
                    <Badge
                      size="sm"
                      variant="purple"
                      className="text-[10px]"
                    >
                      {getSourceLabel(inc.source)}
                    </Badge>
                  </td>
                  <td className="py-3 text-gray-400 text-xs">
                    {inc.platform ? `${getPlatformEmoji(inc.platform)} ${inc.platform}` : '-'}
                  </td>
                  <td className="py-3 text-right font-semibold text-emerald-400">
                    {formatCurrency(inc.amount)}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(inc)} className="p-1 text-gray-500 hover:text-violet-400 rounded">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteIncome(inc)} className="p-1 text-gray-500 hover:text-red-400 rounded">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Income Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editIncome ? 'Editar Ingreso' : 'Registrar Ingreso'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Monto (USD)" type="number" placeholder="0.00" step="0.01" error={errors.amount?.message} {...register('amount')} />
            <Input label="Fecha" type="date" error={errors.date?.message} {...register('date')} />
          </div>
          <Select label="Fuente" options={[
            { value: 'brand_deal', label: 'Brand Deal' },
            { value: 'affiliate', label: 'Afiliados' },
            { value: 'adsense', label: 'AdSense' },
            { value: 'merch', label: 'Merchandise' },
            { value: 'tips', label: 'Tips/Donaciones' },
            { value: 'subscription', label: 'Suscripciones' },
            { value: 'consulting', label: 'Consultoría' },
            { value: 'other', label: 'Otro' },
          ]} {...register('source')} />
          <Select label="Plataforma (opcional)" options={[
            { value: '', label: 'Ninguna / General' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'tiktok', label: 'TikTok' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'twitter', label: 'Twitter/X' },
            { value: 'linkedin', label: 'LinkedIn' },
          ]} {...register('platform')} />
          <Input label="Descripción (opcional)" placeholder="Ej: Campaña Nike Running" {...register('description')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading}>{editIncome ? 'Guardar' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete income modal */}
      <Modal open={!!deleteIncome} onClose={() => setDeleteIncome(null)} title="Eliminar Ingreso" size="sm">
        <p className="text-sm text-gray-400 mb-4">¿Eliminar el ingreso de <strong className="text-white">{deleteIncome && formatCurrency(deleteIncome.amount)}</strong>?</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteIncome(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>

      {/* Metric Create/Edit Modal */}
      <Modal open={showMetricModal} onClose={() => setShowMetricModal(false)} title={editMetric ? 'Editar Métrica' : 'Registrar Métricas'} size="md">
        <form onSubmit={handleSubmitMetric(onSubmitMetric)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Plataforma" options={[
              { value: 'instagram', label: 'Instagram' },
              { value: 'tiktok',    label: 'TikTok' },
              { value: 'youtube',   label: 'YouTube' },
              { value: 'twitter',   label: 'Twitter/X' },
              { value: 'linkedin',  label: 'LinkedIn' },
            ]} {...registerMetric('platform')} />
            <Input label="Fecha" type="date" error={metricErrors.date?.message} {...registerMetric('date')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Seguidores" type="number" min="0" error={metricErrors.followers?.message} {...registerMetric('followers')} />
            <Input label="Engagement (%)" type="number" min="0" max="100" step="0.01" placeholder="3.5" {...registerMetric('engagement')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Siguiendo" type="number" min="0" {...registerMetric('following')} />
            <Input label="Posts" type="number" min="0" {...registerMetric('posts')} />
            <Input label="Alcance" type="number" min="0" {...registerMetric('reach')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Impresiones" type="number" min="0" {...registerMetric('impressions')} />
            <Input label="Likes" type="number" min="0" {...registerMetric('likes')} />
            <Input label="Comentarios" type="number" min="0" {...registerMetric('comments')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowMetricModal(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading}>{editMetric ? 'Guardar' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete metric modal */}
      <Modal open={!!deleteMetric} onClose={() => setDeleteMetric(null)} title="Eliminar Métrica" size="sm">
        <p className="text-sm text-gray-400 mb-4">
          ¿Eliminar la métrica de <strong className="text-white capitalize">{deleteMetric?.platform}</strong>{' '}
          del <strong className="text-white">{deleteMetric && format(new Date(deleteMetric.date), 'd MMM yy', { locale: es })}</strong>?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteMetric(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDeleteMetric}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
