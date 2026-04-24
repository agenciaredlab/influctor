'use client'

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Users, DollarSign, Zap, TrendingUp, CreditCard, Database, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

const PLAN_COLORS: Record<string, string> = {
  free:     '#6b7280',
  creator:  '#8b5cf6',
  pro:      '#06b6d4',
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', creator: 'Creator', pro: 'Pro',
}

function formatK(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function Tooltip2({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} className="font-medium" style={{ color: e.color || e.fill || '#a78bfa' }}>
          {e.name}: {e.value}
        </p>
      ))}
    </div>
  )
}

interface AdminClientProps {
  stats: {
    totalUsers:   number
    mrr:          number
    activeSubs:   number
    aiThisMonth:  number
    totalAiUsages: number
    freeCount:    number
    creatorCount: number
    proCount:     number
  }
  dailySignups: { date: string; signups: number }[]
  recentSignups: { id: string; name: string; email: string; plan: string; planStatus: string; createdAt: string }[]
  topAiUsers:   { id: string; name: string; email: string; plan: string; aiUsageThisMonth: number }[]
}

export default function AdminClient({ stats, dailySignups, recentSignups, topAiUsers }: AdminClientProps) {
  const planDistribution = [
    { name: 'Free',    value: stats.freeCount,    color: PLAN_COLORS.free },
    { name: 'Creator', value: stats.creatorCount, color: PLAN_COLORS.creator },
    { name: 'Pro',     value: stats.proCount,     color: PLAN_COLORS.pro },
  ].filter(p => p.value > 0)

  const maxAi = topAiUsers[0]?.aiUsageThisMonth ?? 1

  const kpis = [
    {
      label:  'Usuarios totales',
      value:  formatK(stats.totalUsers),
      icon:   Users,
      color:  'text-violet-400',
      bg:     'bg-violet-500/10',
    },
    {
      label:  'MRR estimado',
      value:  `$${stats.mrr.toLocaleString()}`,
      icon:   DollarSign,
      color:  'text-emerald-400',
      bg:     'bg-emerald-500/10',
      sub:    `${stats.activeSubs} suscripciones activas`,
    },
    {
      label:  'IA generaciones (mes)',
      value:  formatK(stats.aiThisMonth),
      icon:   Zap,
      color:  'text-amber-400',
      bg:     'bg-amber-500/10',
      sub:    `${formatK(stats.totalAiUsages)} total histórico`,
    },
    {
      label:  'Distribución de planes',
      value:  `${stats.creatorCount + stats.proCount} paid`,
      icon:   CreditCard,
      color:  'text-blue-400',
      bg:     'bg-blue-500/10',
      sub:    `${stats.freeCount} free · ${stats.creatorCount} creator · ${stats.proCount} pro`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex justify-end">
        <a
          href="/admin/settings"
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a45] hover:border-purple-500/50 text-gray-300 hover:text-white text-sm rounded-lg transition-colors"
        >
          <Settings size={14} />
          Configuración de servicios
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon size={16} className={kpi.color} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-0.5">{kpi.value}</div>
            <div className="text-xs text-gray-500">{kpi.label}</div>
            {kpi.sub && <div className="text-[10px] text-gray-600 mt-1">{kpi.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User growth (last 30 days) */}
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
            <TrendingUp size={14} className="text-violet-400" />
            Nuevos registros — últimos 30 días
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailySignups}>
              <defs>
                <linearGradient id="grad-signups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<Tooltip2 />} />
              <Area
                type="monotone"
                dataKey="signups"
                name="Registros"
                stroke="#8b5cf6"
                fill="url(#grad-signups)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Plan distribution donut */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Database size={14} className="text-violet-400" />
            Distribución de planes
          </h3>
          {planDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {planDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-lg p-2 text-xs">
                          <p style={{ color: payload[0].payload.color }} className="font-medium">{payload[0].name}</p>
                          <p className="text-white">{payload[0].value} usuarios</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {planDistribution.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-400">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-200 font-medium">{item.value}</span>
                      <span className="text-gray-600">
                        {stats.totalUsers > 0 ? ((item.value / stats.totalUsers) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600 text-center py-8">Sin datos aún</p>
          )}
        </Card>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent signups */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Registros recientes</h3>
          <div className="space-y-2">
            {recentSignups.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-4">Sin registros</p>
            )}
            {recentSignups.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-1.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{u.name}</p>
                  <p className="text-[10px] text-gray-600 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                    style={{
                      color:            PLAN_COLORS[u.plan] || '#6b7280',
                      borderColor:      (PLAN_COLORS[u.plan] || '#6b7280') + '50',
                      backgroundColor:  (PLAN_COLORS[u.plan] || '#6b7280') + '15',
                    }}
                  >
                    {PLAN_LABELS[u.plan] ?? u.plan}
                  </span>
                  <span className="text-[9px] text-gray-600">
                    {format(new Date(u.createdAt), 'd MMM yy', { locale: es })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top AI users */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={13} className="text-amber-400" />
            Top usuarios por uso de IA (este mes)
          </h3>
          <div className="space-y-3">
            {topAiUsers.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-4">Sin generaciones este mes</p>
            )}
            {topAiUsers.map((u, i) => (
              <div key={u.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-gray-600 w-4 flex-shrink-0">#{i + 1}</span>
                    <p className="text-xs text-gray-300 truncate">{u.name}</p>
                    <span
                      className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
                      style={{ color: PLAN_COLORS[u.plan] || '#6b7280', backgroundColor: (PLAN_COLORS[u.plan] || '#6b7280') + '20' }}
                    >
                      {PLAN_LABELS[u.plan] ?? u.plan}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-amber-400 flex-shrink-0 ml-2">
                    {u.aiUsageThisMonth}
                  </span>
                </div>
                <div className="h-1 bg-[#1e1e35] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500/60 rounded-full transition-all"
                    style={{ width: `${(u.aiUsageThisMonth / maxAi) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
