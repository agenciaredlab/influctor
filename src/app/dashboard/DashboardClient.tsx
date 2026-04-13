'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, DollarSign, Megaphone, Target,
  ArrowRight, ArrowUpRight, Instagram, Youtube, Star
} from 'lucide-react'
import { format, subDays, startOfMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import {
  formatCurrency, formatNumber, formatPercent,
  getStatusColor, getStatusLabel, getPlatformEmoji,
  getCategoryLabel, calculateProgress
} from '@/lib/utils'

interface DashboardClientProps {
  data: {
    user: { name: string; email: string }
    goals: any[]
    campaigns: any[]
    stats: {
      totalFollowers: number
      followerGrowth: number
      avgEngagement: number
      engagementChange: number
      monthlyIncome: number
      incomeChange: number
      activeCampaigns: number
      goalsCompleted: number
      totalGoals: number
    }
    latestByPlatform: Record<string, any>
    recentIncomes: any[]
    incomeChart: any[]
    growthChart: any[]
  }
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#e1306c',
  tiktok: '#69c9d0',
  youtube: '#ff0000',
  twitter: '#1da1f2',
  linkedin: '#0077b5',
}

function StatCard({ title, value, change, icon: Icon, color, prefix, suffix }: {
  title: string
  value: number | string
  change?: number
  icon: any
  color: string
  prefix?: string
  suffix?: string
}) {
  const isPositive = (change ?? 0) >= 0
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 ${color}`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} bg-opacity-20`}>
          <Icon size={18} className={`${color} text-opacity-100`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
          }`}>
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        {prefix}{typeof value === 'number' ? formatNumber(value) : value}{suffix}
      </div>
      <div className="text-xs text-gray-500">{title}</div>
    </Card>
  )
}

function CustomTooltip({ active, payload, label, prefix = '', suffix = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="font-medium" style={{ color: entry.color }}>
          {entry.name}: {prefix}{typeof entry.value === 'number' && entry.value > 1000 ? formatNumber(entry.value) : entry.value?.toFixed(1)}{suffix}
        </p>
      ))}
    </div>
  )
}

export default function DashboardClient({ data }: DashboardClientProps) {
  const { stats, goals, campaigns, latestByPlatform, recentIncomes, incomeChart, growthChart } = data

  // Process growth chart data (monthly aggregated)
  const growthData = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {}
    for (const m of growthChart) {
      const month = format(new Date(m.date), 'MMM', { locale: es })
      if (!byMonth[month]) byMonth[month] = {}
      if (!byMonth[month][m.platform] || new Date(m.date) > new Date(growthChart.find(g => g.platform === m.platform && format(new Date(g.date), 'MMM', { locale: es }) === month)?.date || 0)) {
        byMonth[month][m.platform] = m.followers
      }
    }
    return Object.entries(byMonth).map(([month, platforms]) => ({ month, ...platforms }))
  }, [growthChart])

  // Process income chart data (monthly)
  const incomeData = useMemo(() => {
    const byMonth: Record<string, number> = {}
    for (const inc of incomeChart) {
      const month = format(new Date(inc.date), 'MMM yy', { locale: es })
      byMonth[month] = (byMonth[month] || 0) + inc.amount
    }
    return Object.entries(byMonth).map(([month, total]) => ({ month, total }))
  }, [incomeChart])

  // Income by source (pie)
  const incomeBySource = useMemo(() => {
    const by: Record<string, number> = {}
    for (const inc of incomeChart) {
      by[inc.source] = (by[inc.source] || 0) + inc.amount
    }
    const sourceLabels: Record<string, string> = {
      brand_deal: 'Brand Deals',
      affiliate: 'Afiliados',
      adsense: 'AdSense',
      merch: 'Merch',
      tips: 'Tips',
      consulting: 'Consultoría',
      subscription: 'Suscripciones',
      other: 'Otro',
    }
    const colors = ['#7c3aed', '#8b5cf6', '#a78bfa', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
    return Object.entries(by).map(([source, value], i) => ({
      name: sourceLabels[source] || source,
      value: Math.round(value),
      color: colors[i % colors.length],
    }))
  }, [incomeChart])

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 4)
  const activeCampaigns = campaigns.filter(c => c.status === 'active').slice(0, 3)

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Seguidores totales"
          value={stats.totalFollowers}
          change={stats.followerGrowth}
          icon={Users}
          color="text-violet-400 bg-violet-900"
        />
        <StatCard
          title="Engagement promedio"
          value={stats.avgEngagement.toFixed(1)}
          change={stats.engagementChange}
          icon={TrendingUp}
          color="text-emerald-400 bg-emerald-900"
          suffix="%"
        />
        <StatCard
          title="Ingresos del mes"
          value={formatCurrency(stats.monthlyIncome)}
          change={stats.incomeChange}
          icon={DollarSign}
          color="text-amber-400 bg-amber-900"
        />
        <StatCard
          title="Campañas activas"
          value={stats.activeCampaigns}
          icon={Megaphone}
          color="text-pink-400 bg-pink-900"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Follower Growth Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Crecimiento de Seguidores</h3>
              <p className="text-xs text-gray-500 mt-0.5">Últimos 6 meses por plataforma</p>
            </div>
            <Link href="/analytics" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              Ver más <ArrowRight size={12} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={growthData}>
              <defs>
                {Object.entries(PLATFORM_COLORS).map(([platform, color]) => (
                  <linearGradient key={platform} id={`grad-${platform}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <Tooltip content={<CustomTooltip />} />
              {Object.keys(PLATFORM_COLORS).map((platform) => (
                growthData.some(d => (d as Record<string, unknown>)[platform]) && (
                  <Area
                    key={platform}
                    type="monotone"
                    dataKey={platform}
                    stroke={PLATFORM_COLORS[platform]}
                    fill={`url(#grad-${platform})`}
                    strokeWidth={2}
                    dot={false}
                    name={platform.charAt(0).toUpperCase() + platform.slice(1)}
                  />
                )
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Income by Source Pie */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Ingresos por Fuente</h3>
              <p className="text-xs text-gray-500 mt-0.5">Distribución total</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={incomeBySource}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {incomeBySource.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-2 text-xs">
                      <p style={{ color: payload[0].payload.color }}>{payload[0].name}</p>
                      <p className="text-white font-medium">{formatCurrency(payload[0].value as number)}</p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {incomeBySource.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-400">{item.name}</span>
                </div>
                <span className="text-gray-300 font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly Income Bar */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Ingresos Mensuales</h3>
            <p className="text-xs text-gray-500 mt-0.5">Evolución de los últimos 6 meses</p>
          </div>
          <Link href="/analytics" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
            Ver análisis completo <ArrowRight size={12} />
          </Link>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={incomeData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-3 text-xs">
                    <p className="text-gray-400 mb-1">{label}</p>
                    <p className="text-violet-400 font-bold">{formatCurrency(payload[0].value as number)}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="total" fill="url(#barGrad)" radius={[4, 4, 0, 0]} name="Ingresos" />
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#4c1d95" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Bottom row: Goals + Campaigns + Platforms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Goals */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Target size={15} className="text-violet-400" />
              Metas Activas
            </h3>
            <Link href="/goals" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-4">
            {activeGoals.map((goal) => {
              const progress = calculateProgress(goal.currentValue, goal.targetValue)
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{getPlatformEmoji(goal.platform || 'all')}</span>
                      <span className="text-xs text-gray-300 truncate">{goal.title}</span>
                    </div>
                    <span className="text-xs font-semibold text-violet-400 ml-2">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} showLabel={false} size="xs" />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-600">{formatNumber(goal.currentValue)} {goal.unit}</span>
                    <span className="text-[10px] text-gray-600">Meta: {formatNumber(goal.targetValue)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-[#1e1e35] flex items-center justify-between text-xs">
            <span className="text-gray-500">{stats.goalsCompleted} completadas</span>
            <span className="text-violet-400">{stats.totalGoals} totales</span>
          </div>
        </Card>

        {/* Active Campaigns */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone size={15} className="text-pink-400" />
              Campañas
            </h3>
            <Link href="/campaigns" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {activeCampaigns.map((camp) => {
              const budgetUsed = camp.budget > 0 ? (camp.spent / camp.budget) * 100 : 0
              return (
                <div key={camp.id} className="p-3 rounded-lg bg-[#0f0f1a] border border-[#1e1e35]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-white truncate flex-1">{camp.name}</span>
                    <Badge
                      variant={camp.status === 'active' ? 'success' : 'warning'}
                      size="sm"
                      dot
                    >
                      {getStatusLabel(camp.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span>{getPlatformEmoji(camp.platform)} {camp.platform}</span>
                    <span>•</span>
                    <span>{formatNumber(camp.reach)} alcance</span>
                    <span>•</span>
                    <span>{formatNumber(camp.impressions)} impr.</span>
                  </div>
                  {camp.budget > 0 && (
                    <div className="mt-2">
                      <Progress value={budgetUsed} size="xs" color="auto" />
                      <div className="flex justify-between mt-1 text-[10px] text-gray-600">
                        <span>Gastado: {formatCurrency(camp.spent)}</span>
                        <span>Budget: {formatCurrency(camp.budget)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Platform Overview */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Plataformas</h3>
            <Link href="/analytics" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              Analytics <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {Object.entries(latestByPlatform).map(([platform, metric]: [string, any]) => (
              <div key={platform} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ background: `${PLATFORM_COLORS[platform]}20` }}>
                  {getPlatformEmoji(platform)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300 capitalize">{platform}</span>
                    <span className="text-xs font-bold text-white">{formatNumber(metric.followers)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-600">seguidores</span>
                    <span className="text-[10px]" style={{ color: PLATFORM_COLORS[platform] }}>
                      {metric.engagement.toFixed(1)}% eng.
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Income */}
          <div className="mt-4 pt-3 border-t border-[#1e1e35]">
            <h4 className="text-xs font-medium text-gray-400 mb-3">Ingresos recientes</h4>
            <div className="space-y-2">
              {recentIncomes.slice(0, 3).map((inc) => (
                <div key={inc.id} className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 truncate flex-1">{inc.description || inc.source}</div>
                  <span className="text-xs font-medium text-emerald-400 ml-2">{formatCurrency(inc.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
