'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, DollarSign, Target, Sparkles, RefreshCw, Download, Calendar, CheckCircle, Clock, Zap, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEMO_REPORT = {
  week: 'Semana del 8 al 14 de Abril, 2024',
  summary: {
    followers_gained: 1240,
    followers_change: +18.3,
    reach: 48200,
    reach_change: +12.1,
    engagement_rate: 4.7,
    eng_change: +0.3,
    income: 1850,
    income_change: +22.0,
  },
  top_content: [
    { title: 'Cómo gané $5K en mi primer mes como creador', views: 24300, likes: 1820, platform: 'TikTok' },
    { title: '5 herramientas de IA que uso cada día', views: 18700, likes: 1340, platform: 'Instagram' },
    { title: 'Mi rutina mañanera que cambió mi productividad', views: 9400, likes: 720, platform: 'Instagram' },
  ],
  goals_progress: [
    { title: '10K seguidores en TikTok', progress: 73, current: 7300, target: 10000 },
    { title: 'Ingresos $2K/mes', progress: 92, current: 1850, target: 2000 },
    { title: '3 brand deals activos', progress: 33, current: 1, target: 3 },
  ],
  ai_usage: 14,
  recommendations: [
    'Tu mejor día para publicar fue el jueves (2.3x más alcance). Prioriza ese día.',
    'Los Reels de tips prácticos generaron 40% más engagement que el contenido de estilo de vida.',
    'Responder comentarios en la primera hora aumentó tu alcance un 28%.',
    'Considera aumentar la frecuencia en TikTok de 5 a 7 posts por semana.',
  ],
  goals_next_week: [
    'Publicar 7 videos en TikTok (meta: 10K seguidores)',
    'Cerrar 1 brand deal con marca de productividad',
    'Crear 1 carrusel educativo para Instagram',
    'Responder todos los comentarios en las primeras 2h',
  ],
}

const WEEK_OPTIONS = [
  'Semana del 8 al 14 Abr',
  'Semana del 1 al 7 Abr',
  'Semana del 25 al 31 Mar',
  'Semana del 18 al 24 Mar',
]

function StatCard({ label, value, change, icon: Icon, color }: { label: string; value: string; change: number; icon: any; color: string }) {
  const isUp = change >= 0
  return (
    <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon size={14} />
        </div>
        <div className={cn('flex items-center gap-0.5 text-xs font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
          {isUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="text-xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

interface Props {
  data: {
    goals: any[]
    income: any[]
    campaigns: any[]
    aiUsage: any[]
  }
}

export default function ReportsClient({ data }: Props) {
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [aiInsight, setAiInsight] = useState('')

  const r = DEMO_REPORT

  async function generateInsight() {
    setGenerating(true)
    setAiInsight('')
    const prompt = `Genera un resumen ejecutivo de esta semana para un creador de contenido:

Datos clave:
- Nuevos seguidores: +${r.summary.followers_gained} (${r.summary.followers_change}% vs semana anterior)
- Alcance: ${r.summary.reach.toLocaleString()} personas
- Engagement: ${r.summary.engagement_rate}%
- Ingresos: $${r.summary.income}

Mejor contenido:
${r.top_content.map(c => `- "${c.title}" (${c.views.toLocaleString()} views en ${c.platform})`).join('\n')}

Dame:
1. Un análisis de qué está funcionando y por qué
2. El patrón de crecimiento que observas
3. Las 3 acciones más importantes para la próxima semana
4. Un pronóstico realista si sigue esta tendencia`

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'strategy', fields: { topic: prompt, platform: 'instagram' } }),
      })
      const resData = await res.json()
      setAiInsight(resData.result || '')
    } catch {}
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(Number(e.target.value))}
            className="px-3 py-2 bg-[#13131f] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
          >
            {WEEK_OPTIONS.map((w, i) => (
              <option key={i} value={i}>{w}</option>
            ))}
          </select>
          {selectedWeek === 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Esta semana</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateInsight}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {generating ? <><RefreshCw size={12} className="animate-spin" /> Generando...</> : <><Sparkles size={12} /> Insight IA</>}
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-[#13131f] border border-[#1a1a2e] text-gray-400 hover:text-gray-200 text-xs rounded-lg transition-colors">
            <Download size={12} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Nuevos seguidores" value={`+${r.summary.followers_gained.toLocaleString()}`} change={r.summary.followers_change} icon={TrendingUp} color="bg-violet-500/10 text-violet-400" />
        <StatCard label="Alcance total" value={`${(r.summary.reach / 1000).toFixed(1)}K`} change={r.summary.reach_change} icon={BarChart3} color="bg-blue-500/10 text-blue-400" />
        <StatCard label="Engagement" value={`${r.summary.engagement_rate}%`} change={r.summary.eng_change} icon={Zap} color="bg-amber-500/10 text-amber-400" />
        <StatCard label="Ingresos" value={`$${r.summary.income.toLocaleString()}`} change={r.summary.income_change} icon={DollarSign} color="bg-emerald-500/10 text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Top content */}
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={13} className="text-violet-400" />
              Mejor contenido de la semana
            </h3>
            <div className="space-y-3">
              {r.top_content.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#0d0d1a] rounded-lg">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold', i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400')}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.platform}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{(c.views / 1000).toFixed(1)}K</div>
                    <div className="text-xs text-gray-500">❤️ {c.likes.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <Sparkles size={13} className="text-amber-400" />
              Insights automáticos
            </h3>
            <div className="space-y-2">
              {r.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 bg-[#0d0d1a] rounded-lg">
                  <CheckCircle size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-300">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insight */}
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
            <div className="space-y-4">
              {r.goals_progress.map((goal, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-300 font-medium">{goal.title}</span>
                    <span className="text-xs font-bold text-white">{goal.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0d0d1a] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', goal.progress >= 80 ? 'bg-emerald-500' : goal.progress >= 50 ? 'bg-violet-500' : 'bg-amber-500')}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{goal.current.toLocaleString()} / {goal.target.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Next week goals */}
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
              <Calendar size={13} className="text-blue-400" />
              Objetivos próxima semana
            </h3>
            <div className="space-y-2">
              {r.goals_next_week.map((goal, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-violet-500/40 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-400">{goal}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI usage */}
          <div className="bg-gradient-to-br from-violet-900/15 to-purple-900/5 border border-violet-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Zap size={13} className="text-violet-400" />
                Uso de IA
              </h3>
              <span className="text-lg font-bold text-violet-300">{r.ai_usage}</span>
            </div>
            <p className="text-xs text-gray-500">Generaciones de contenido con IA esta semana</p>
          </div>
        </div>
      </div>
    </div>
  )
}
