'use client'

import { useState } from 'react'
import {
  BarChart3, TrendingUp, DollarSign, Target, Sparkles, RefreshCw,
  Download, Calendar, CheckCircle, Zap, ArrowUp, ArrowDown, Mail,
  AlertCircle, Link as LinkIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import UpgradeGate from '@/components/ui/UpgradeGate'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalData      { title: string; currentValue: number; targetValue: number; unit: string; platform: string | null }
interface IncomeData    { amount: number; date: string; source: string; platform: string | null }
interface UsageData     { createdAt: string }
interface PostData      { title: string; platform: string; type: string; publishedAt: string | null }
interface SnapshotData  { date: string; platform: string; followers: number; newFollowers: number; reach: number; impressions: number; engagement: number }

interface Props {
  plan: string
  goals: GoalData[]
  income: IncomeData[]
  aiUsage: UsageData[]
  contentPosts: PostData[]
  snapshots: SnapshotData[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weekBounds(weeksAgo = 0) {
  const end = new Date()
  end.setDate(end.getDate() - weeksAgo * 7)
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

function sumIncome(income: IncomeData[], start: Date, end: Date) {
  return income
    .filter(i => { const d = new Date(i.date); return d >= start && d <= end })
    .reduce((s, i) => s + i.amount, 0)
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

function weekLabel(weeksAgo = 0) {
  const { start, end } = weekBounds(weeksAgo)
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `Semana del ${fmt(start)} al ${fmt(end)}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, change, icon: Icon, color, hasData,
}: {
  label: string; value: string; change: number; icon: any; color: string; hasData: boolean
}) {
  const isUp = change >= 0
  return (
    <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon size={14} className={color.split(' ')[1]} />
        </div>
        {hasData ? (
          <div className={cn('flex items-center gap-0.5 text-xs font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
            {isUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(change)}%
          </div>
        ) : (
          <span className="text-[10px] text-gray-600">sin datos</span>
        )}
      </div>
      <div className="text-xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const WEEK_COUNT = 4

export default function ReportsClient({ plan, goals, income, aiUsage, contentPosts, snapshots }: Props) {
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [generating, setGenerating]     = useState(false)
  const [aiInsight, setAiInsight]       = useState('')
  const [sending, setSending]           = useState(false)
  const [sendResult, setSendResult]     = useState<{ ok?: boolean; error?: string } | null>(null)

  // ── Computed metrics for selected week ──────────────────────────────────────
  const { start: wStart, end: wEnd }       = weekBounds(selectedWeek)
  const { start: pStart, end: pEnd }       = weekBounds(selectedWeek + 1)

  // Income
  const weekIncome = sumIncome(income, wStart, wEnd)
  const prevIncome = sumIncome(income, pStart, pEnd)
  const hasIncomeData = income.length > 0
  const incomeChange  = pctChange(weekIncome, prevIncome)

  // AI usage
  const weekAiCount = aiUsage.filter(a => {
    const d = new Date(a.createdAt); return d >= wStart && d <= wEnd
  }).length
  const prevAiCount = aiUsage.filter(a => {
    const d = new Date(a.createdAt); return d >= pStart && d <= pEnd
  }).length

  // Social snapshots
  const weekSnaps   = snapshots.filter(s => { const d = new Date(s.date); return d >= wStart && d <= wEnd })
  const latestSnap  = weekSnaps[0]
  const hasSnapData = weekSnaps.length > 0

  const totalNewFollowers = weekSnaps.reduce((s, sn) => s + sn.newFollowers, 0)
  const prevSnaps         = snapshots.filter(s => { const d = new Date(s.date); return d >= pStart && d <= pEnd })
  const prevNewFollowers  = prevSnaps.reduce((s, sn) => s + sn.newFollowers, 0)
  const followersChange   = pctChange(totalNewFollowers, prevNewFollowers)

  const avgReach          = weekSnaps.length > 0 ? Math.round(weekSnaps.reduce((s, sn) => s + sn.reach, 0) / weekSnaps.length) : 0
  const prevAvgReach      = prevSnaps.length > 0 ? Math.round(prevSnaps.reduce((s, sn) => s + sn.reach, 0) / prevSnaps.length) : 0
  const reachChange       = pctChange(avgReach, prevAvgReach)

  const avgEngagement     = weekSnaps.length > 0 ? parseFloat((weekSnaps.reduce((s, sn) => s + sn.engagement, 0) / weekSnaps.length).toFixed(2)) : 0
  const prevAvgEng        = prevSnaps.length > 0 ? parseFloat((prevSnaps.reduce((s, sn) => s + sn.engagement, 0) / prevSnaps.length).toFixed(2)) : 0
  const engChange         = pctChange(avgEngagement, prevAvgEng)

  // Goals progress (real)
  const goalsProgress = goals.slice(0, 4).map(g => ({
    title:    g.title,
    progress: g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0,
    current:  g.currentValue,
    target:   g.targetValue,
    unit:     g.unit,
  }))

  // Top content this week (real published posts)
  const weekPosts = contentPosts.filter(p => {
    if (!p.publishedAt) return false
    const d = new Date(p.publishedAt)
    return d >= wStart && d <= wEnd
  })
  // If no posts this week, show most recent published posts
  const topContent = (weekPosts.length > 0 ? weekPosts : contentPosts).slice(0, 3)

  // Next week suggestions from active goals
  const nextWeekGoals = goals.slice(0, 4).map(g => {
    const pct = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0
    const remaining = Math.ceil(g.targetValue - g.currentValue)
    return `${g.title} — quedan ${remaining.toLocaleString()} ${g.unit} (${Math.round(pct)}%)`
  })

  // Build AI prompt with real data
  async function generateInsight() {
    setGenerating(true)
    setAiInsight('')

    const incomeStr  = hasIncomeData ? `$${weekIncome.toFixed(0)}` : 'no registrado'
    const followStr  = hasSnapData ? `+${totalNewFollowers}` : 'no conectado'
    const reachStr   = hasSnapData ? avgReach.toLocaleString() : 'no disponible'
    const engStr     = hasSnapData ? `${avgEngagement}%` : 'no disponible'
    const postsStr   = topContent.map(p => `- "${p.title}" en ${p.platform}`).join('\n') || '- Sin posts publicados esta semana'
    const goalsStr   = goalsProgress.map(g => `- ${g.title}: ${g.progress}% (${g.current.toLocaleString()}/${g.target.toLocaleString()} ${g.unit})`).join('\n') || '- Sin metas activas'

    const prompt = `Eres un estratega de contenido. Analiza esta semana de un creador de contenido:

MÉTRICAS SOCIALES:
- Nuevos seguidores: ${followStr}
- Alcance promedio: ${reachStr}
- Engagement: ${engStr}
- Ingresos esta semana: ${incomeStr}
- Generaciones de IA usadas: ${weekAiCount}

CONTENIDO PUBLICADO:
${postsStr}

PROGRESO DE METAS:
${goalsStr}

Dame un análisis breve y accionable con:
1. Qué está funcionando bien esta semana
2. El área más urgente a mejorar
3. Las 3 acciones concretas para la próxima semana`

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'strategy', fields: { topic: prompt, platform: 'instagram' } }),
      })
      const data = await res.json()
      setAiInsight(data.result || '')
    } catch {}
    setGenerating(false)
  }

  async function sendEmailReport() {
    setSending(true)
    setSendResult(null)
    try {
      const res  = await fetch('/api/email/weekly-report', { method: 'POST' })
      const data = await res.json()
      setSendResult(res.ok ? { ok: true } : { error: data.error })
    } catch { setSendResult({ error: 'Error de conexión' }) }
    setSending(false)
    setTimeout(() => setSendResult(null), 5000)
  }

  const weekOptions = Array.from({ length: WEEK_COUNT }, (_, i) => weekLabel(i))

  const noSocialData = !hasSnapData

  return (
    <div className="space-y-6">

      {/* Send result banner */}
      {sendResult && (
        <div className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border',
          sendResult.ok
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        )}>
          {sendResult.ok
            ? <><CheckCircle size={14} /> Reporte enviado a tu email</>
            : <><Zap size={14} /> {sendResult.error}</>}
        </div>
      )}

      {/* No social data notice */}
      {noSocialData && (
        <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <LinkIcon size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-300">Conecta Instagram para métricas en tiempo real</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Los datos de seguidores, alcance y engagement provienen de la API de Instagram.{' '}
              <a href="/settings" className="text-blue-400 hover:underline">Conectar cuenta →</a>
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(Number(e.target.value))}
            className="px-3 py-2 bg-[#13131f] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
          >
            {weekOptions.map((w, i) => (
              <option key={i} value={i}>{w}</option>
            ))}
          </select>
          {selectedWeek === 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Esta semana</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {plan === 'free' ? (
            <UpgradeGate plan={plan} requiredPlan="creator" feature="Insight IA" variant="banner" className="!py-1 !px-3" />
          ) : (
            <button
              onClick={generateInsight}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {generating
                ? <><RefreshCw size={12} className="animate-spin" /> Generando...</>
                : <><Sparkles size={12} /> Insight IA</>}
            </button>
          )}
          {plan !== 'free' && (
            <button
              onClick={sendEmailReport}
              disabled={sending}
              className="flex items-center gap-2 px-3 py-2 bg-[#13131f] border border-[#1a1a2e] text-gray-400 hover:text-gray-200 text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              {sending
                ? <><RefreshCw size={12} className="animate-spin" /> Enviando...</>
                : <><Mail size={12} /> Enviar por email</>}
            </button>
          )}
          <button className="flex items-center gap-2 px-3 py-2 bg-[#13131f] border border-[#1a1a2e] text-gray-400 hover:text-gray-200 text-xs rounded-lg transition-colors">
            <Download size={12} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Nuevos seguidores"
          value={hasSnapData ? `+${totalNewFollowers.toLocaleString()}` : '—'}
          change={followersChange}
          icon={TrendingUp}
          color="bg-violet-500/10 text-violet-400"
          hasData={hasSnapData && (totalNewFollowers > 0 || prevNewFollowers > 0)}
        />
        <StatCard
          label="Alcance promedio"
          value={hasSnapData && avgReach > 0 ? `${(avgReach / 1000).toFixed(1)}K` : '—'}
          change={reachChange}
          icon={BarChart3}
          color="bg-blue-500/10 text-blue-400"
          hasData={hasSnapData && avgReach > 0}
        />
        <StatCard
          label="Engagement"
          value={hasSnapData && avgEngagement > 0 ? `${avgEngagement}%` : '—'}
          change={engChange}
          icon={Zap}
          color="bg-amber-500/10 text-amber-400"
          hasData={hasSnapData && avgEngagement > 0}
        />
        <StatCard
          label="Ingresos esta semana"
          value={hasIncomeData ? `$${weekIncome.toLocaleString()}` : '—'}
          change={incomeChange}
          icon={DollarSign}
          color="bg-emerald-500/10 text-emerald-400"
          hasData={hasIncomeData && (weekIncome > 0 || prevIncome > 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* Top content */}
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={13} className="text-violet-400" />
              Contenido publicado
              {weekPosts.length > 0 && (
                <span className="text-[10px] text-gray-600 font-normal ml-1">esta semana</span>
              )}
            </h3>
            {topContent.length > 0 ? (
              <div className="space-y-3">
                {topContent.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#0d0d1a] rounded-lg">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400')}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 font-medium truncate">{c.title}</p>
                      <p className="text-xs text-gray-500">{c.platform} · {c.type}</p>
                    </div>
                    {c.publishedAt && (
                      <span className="text-[10px] text-gray-600 flex-shrink-0">
                        {new Date(c.publishedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                <p className="text-sm">Sin posts publicados todavía</p>
                <a href="/calendar" className="text-xs text-violet-400 hover:underline mt-1 inline-block">Programar contenido →</a>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <UpgradeGate
            plan={plan}
            requiredPlan="creator"
            feature="Insights automáticos"
            description="Análisis inteligente de tu contenido, patrones de crecimiento y recomendaciones personalizadas."
            variant="overlay"
          >
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
              <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
                <Sparkles size={13} className="text-amber-400" />
                Insights de la semana
              </h3>
              <div className="space-y-2">
                {[
                  weekAiCount > 0
                    ? `Usaste la IA ${weekAiCount} ${weekAiCount === 1 ? 'vez' : 'veces'} esta semana — sigue generando contenido con consistencia.`
                    : 'No usaste el generador de IA esta semana — prueba el AI Studio para acelerar tu producción.',
                  hasIncomeData && weekIncome > 0
                    ? `Generaste $${weekIncome.toFixed(0)} esta semana. ${weekIncome > prevIncome ? 'Tendencia positiva — sigue monetizando.' : 'Explora nuevas fuentes de ingreso.'}`
                    : 'Registra tus ingresos en Analytics para ver el progreso de monetización.',
                  goalsProgress.length > 0
                    ? `Meta más cercana: "${goalsProgress.sort((a, b) => b.progress - a.progress)[0]?.title}" al ${goalsProgress[0]?.progress}%.`
                    : 'Crea metas en la sección Goals para seguir tu progreso semana a semana.',
                  hasSnapData
                    ? avgEngagement > 3
                      ? `Engagement de ${avgEngagement}% — por encima del promedio. Mantén el ritmo de respuesta a comentarios.`
                      : `Engagement de ${avgEngagement}% — intenta responder comentarios en la primera hora de publicar.`
                    : 'Conecta Instagram para ver métricas de engagement en tiempo real.',
                ].map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-[#0d0d1a] rounded-lg">
                    <CheckCircle size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-300">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </UpgradeGate>

          {/* AI Deep insight */}
          {aiInsight && (
            <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/10 border border-violet-500/20 rounded-xl p-4">
              <h3 className="font-semibold text-violet-300 text-sm mb-3 flex items-center gap-2">
                <Sparkles size={13} /> Análisis IA Profundo
              </h3>
              <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">{aiInsight}</div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Goals progress */}
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <Target size={13} className="text-violet-400" />
              Progreso de metas
            </h3>
            {goalsProgress.length > 0 ? (
              <div className="space-y-4">
                {goalsProgress.map((goal, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-300 font-medium line-clamp-1">{goal.title}</span>
                      <span className="text-xs font-bold text-white ml-2 flex-shrink-0">{goal.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-[#0d0d1a] rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', goal.progress >= 80 ? 'bg-emerald-500' : goal.progress >= 50 ? 'bg-violet-500' : 'bg-amber-500')}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      {goal.current.toLocaleString()} / {goal.target.toLocaleString()} {goal.unit}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-600">
                <Target size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Sin metas activas</p>
                <a href="/goals" className="text-[11px] text-violet-400 hover:underline mt-1 inline-block">Crear meta →</a>
              </div>
            )}
          </div>

          {/* Next week */}
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
              <Calendar size={13} className="text-blue-400" />
              En qué enfocarse
            </h3>
            {nextWeekGoals.length > 0 ? (
              <div className="space-y-2">
                {nextWeekGoals.map((goal, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-violet-500/40 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-400">{goal}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600">Agrega metas activas para ver sugerencias de la próxima semana</p>
            )}
          </div>

          {/* AI usage */}
          <div className="bg-gradient-to-br from-violet-900/15 to-purple-900/5 border border-violet-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Zap size={13} className="text-violet-400" />
                Uso de IA
              </h3>
              <span className="text-lg font-bold text-violet-300">{weekAiCount}</span>
            </div>
            <p className="text-xs text-gray-500">
              Generaciones esta semana
              {prevAiCount > 0 && (
                <span className={cn('ml-2 font-medium', weekAiCount >= prevAiCount ? 'text-emerald-400' : 'text-red-400')}>
                  {weekAiCount >= prevAiCount ? '↑' : '↓'} vs semana anterior ({prevAiCount})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
