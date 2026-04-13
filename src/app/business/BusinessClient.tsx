'use client'

import { useState, useMemo } from 'react'
import {
  Building2, Calculator, TrendingUp, Users, DollarSign,
  Target, BarChart2, Star, Check, ChevronRight, Zap, Info
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── ROI Calculator ──────────────────────────────────────────────
function calcROI(investment: number, reach: number, ctr: number, convRate: number, orderValue: number) {
  const clicks = Math.round(reach * (ctr / 100))
  const conversions = Math.round(clicks * (convRate / 100))
  const revenue = conversions * orderValue
  const roi = investment > 0 ? ((revenue - investment) / investment) * 100 : 0
  const cpa = conversions > 0 ? investment / conversions : 0
  const cpp = reach > 0 ? (investment / reach) * 1000 : 0
  return { clicks, conversions, revenue, roi, cpa, cpp }
}

// ── Influencer tiers ────────────────────────────────────────────
const TIERS = [
  {
    name: 'Nano', range: '1K – 10K', emoji: '🌱',
    engagement: '5–8%', costRange: '$50–$300',
    pros: ['Alta autenticidad', 'Engagement real', 'Nicho muy específico', 'Costo muy bajo'],
    cons: ['Alcance limitado', 'Menos experiencia con brands', 'Puede ser inconsistente'],
    bestFor: 'Lanzamientos de producto, pruebas de mercado, presupuesto limitado',
    color: 'border-emerald-500/30', accent: 'text-emerald-400',
  },
  {
    name: 'Micro', range: '10K – 100K', emoji: '⭐',
    engagement: '3–5%', costRange: '$300–$3,000',
    pros: ['Mejor relación costo-alcance', 'Audiencia comprometida', 'Más profesional', 'Niche authority'],
    cons: ['Más competencia por deals', 'Precio puede subir rápido'],
    bestFor: 'Campañas de awareness y conversión en nichos específicos',
    color: 'border-blue-500/30', accent: 'text-blue-400',
  },
  {
    name: 'Macro', range: '100K – 1M', emoji: '🚀',
    engagement: '1–3%', costRange: '$3,000–$20,000',
    pros: ['Gran alcance', 'Alta credibilidad', 'Producción profesional', 'Experiencia en campañas'],
    cons: ['Costo elevado', 'Engagement menor', 'Menos personalizado', 'Proceso más lento'],
    bestFor: 'Campañas de branding, lanzamientos nacionales o regionales',
    color: 'border-violet-500/30', accent: 'text-violet-400',
  },
  {
    name: 'Mega', range: '1M+', emoji: '💎',
    engagement: '0.5–1.5%', costRange: '$20,000+',
    pros: ['Alcance masivo', 'Reconocimiento de marca inmediato', 'Negociaciones claras'],
    cons: ['ROI difícil de medir', 'Muy costoso', 'Audiencia muy diversa', 'Menos nicho'],
    bestFor: 'Campañas de posicionamiento de marca, lanzamientos globales',
    color: 'border-amber-500/30', accent: 'text-amber-400',
  },
]

// ── Media Kit checklist ─────────────────────────────────────────
const MEDIA_KIT_ITEMS = [
  { id: 'photo', label: 'Foto profesional de perfil', essential: true },
  { id: 'bio', label: 'Bio clara: nicho, audiencia, propuesta de valor', essential: true },
  { id: 'stats', label: 'Estadísticas actualizadas: seguidores, engagement, alcance', essential: true },
  { id: 'audience', label: 'Demografía de audiencia: edad, género, ubicación', essential: true },
  { id: 'rates', label: 'Tarifas por formato (post, reel, story, video)', essential: true },
  { id: 'past-work', label: 'Ejemplos de colaboraciones anteriores', essential: false },
  { id: 'testimonials', label: 'Testimonios de marcas con las que trabajaste', essential: false },
  { id: 'results', label: 'Resultados concretos de campañas: CTR, conversiones', essential: false },
  { id: 'contact', label: 'Email de contacto profesional y redes', essential: true },
  { id: 'terms', label: 'Términos generales: tiempos de entrega, revisiones', essential: false },
]

// ── Campaign Brief template ─────────────────────────────────────
const BRIEF_SECTIONS = [
  { title: 'Objetivo de la campaña', placeholder: 'Ej: Generar 500 ventas del producto X en 30 días', key: 'objective' },
  { title: 'Público objetivo', placeholder: 'Ej: Mujeres 25-35, interés en fitness, CDMX y Buenos Aires', key: 'audience' },
  { title: 'Mensaje clave', placeholder: 'Ej: El producto X resuelve Y problema en Z tiempo', key: 'message' },
  { title: 'Entregables requeridos', placeholder: 'Ej: 2 Reels + 3 Stories + 1 post fijo', key: 'deliverables' },
  { title: 'Restricciones / Do\'s & Don\'ts', placeholder: 'Ej: No mencionar a competidores, usar hashtag #marca', key: 'restrictions' },
  { title: 'Presupuesto total', placeholder: 'Ej: $5,000 USD para 3 influencers micro', key: 'budget' },
]

export default function BusinessClient() {
  const [activeTab, setActiveTab] = useState<'roi' | 'tiers' | 'mediakit' | 'brief'>('roi')

  // ROI calc state
  const [investment, setInvestment] = useState(2000)
  const [reach, setReach] = useState(80000)
  const [ctr, setCtr] = useState(2.5)
  const [convRate, setConvRate] = useState(3)
  const [orderValue, setOrderValue] = useState(50)

  // Media kit checklist
  const [kitChecked, setKitChecked] = useState<Record<string, boolean>>({})

  // Brief state
  const [brief, setBrief] = useState<Record<string, string>>({})

  const roi = useMemo(
    () => calcROI(investment, reach, ctr, convRate, orderValue),
    [investment, reach, ctr, convRate, orderValue]
  )

  const kitProgress = MEDIA_KIT_ITEMS.filter(i => kitChecked[i.id]).length
  const kitEssentialProgress = MEDIA_KIT_ITEMS.filter(i => i.essential && kitChecked[i.id]).length
  const kitEssentialTotal = MEDIA_KIT_ITEMS.filter(i => i.essential).length

  const tabs = [
    { key: 'roi', label: '📊 Calculadora ROI' },
    { key: 'tiers', label: '🎯 Tipos de Influencer' },
    { key: 'mediakit', label: '📋 Media Kit' },
    { key: 'brief', label: '📝 Brief de Campaña' },
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1e1e35] overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap',
              activeTab === t.key
                ? 'text-violet-400 border-violet-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ROI Calculator ── */}
      {activeTab === 'roi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
              <Calculator size={15} className="text-violet-400" /> Parámetros de campaña
            </h3>
            <div className="space-y-5">
              {[
                { label: 'Inversión total (USD)', value: investment, set: setInvestment, min: 100, max: 100000, step: 100, format: (v: number) => formatCurrency(v) },
                { label: 'Alcance estimado (personas)', value: reach, set: setReach, min: 1000, max: 5000000, step: 1000, format: (v: number) => formatNumber(v) },
                { label: `CTR esperado: ${ctr}%`, value: ctr, set: setCtr, min: 0.1, max: 15, step: 0.1, format: (v: number) => `${v}%` },
                { label: `Tasa de conversión: ${convRate}%`, value: convRate, set: setConvRate, min: 0.1, max: 30, step: 0.1, format: (v: number) => `${v}%` },
                { label: `Valor promedio de orden: ${formatCurrency(orderValue)}`, value: orderValue, set: setOrderValue, min: 1, max: 2000, step: 1, format: (v: number) => formatCurrency(v) },
              ].map(({ label, value, set, min, max, step, format }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs text-gray-400">{label}</label>
                    <span className="text-xs font-bold text-white">{format(value)}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={e => set(Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            {/* Main ROI */}
            <Card className={cn(
              'border-2 text-center py-6',
              roi.roi >= 100 ? 'border-emerald-500/40 bg-emerald-950/20'
              : roi.roi >= 0 ? 'border-amber-500/40 bg-amber-950/20'
              : 'border-red-500/40 bg-red-950/20'
            )}>
              <div className={cn(
                'text-5xl font-black mb-1',
                roi.roi >= 100 ? 'text-emerald-400' : roi.roi >= 0 ? 'text-amber-400' : 'text-red-400'
              )}>
                {roi.roi >= 0 ? '+' : ''}{Math.round(roi.roi)}%
              </div>
              <div className="text-sm text-gray-400">Retorno sobre inversión (ROI)</div>
              <div className={cn(
                'mt-3 text-xs font-medium',
                roi.roi >= 200 ? 'text-emerald-400' : roi.roi >= 100 ? 'text-blue-400' : roi.roi >= 0 ? 'text-amber-400' : 'text-red-400'
              )}>
                {roi.roi >= 200 ? '🔥 Excelente campaña' : roi.roi >= 100 ? '✅ Rentable' : roi.roi >= 0 ? '⚠️ Margen ajustado' : '❌ Campaña no rentable'}
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Clics generados', value: formatNumber(roi.clicks), icon: Target, color: 'text-blue-400' },
                { label: 'Conversiones', value: formatNumber(roi.conversions), icon: Zap, color: 'text-violet-400' },
                { label: 'Ingresos estimados', value: formatCurrency(roi.revenue), icon: DollarSign, color: 'text-emerald-400' },
                { label: 'Costo por adquisición', value: formatCurrency(roi.cpa), icon: Users, color: 'text-amber-400' },
                { label: 'CPM (costo por 1K)', value: formatCurrency(roi.cpp), icon: BarChart2, color: 'text-pink-400' },
                { label: 'Ganancia neta', value: formatCurrency(roi.revenue - investment), icon: TrendingUp, color: roi.revenue > investment ? 'text-emerald-400' : 'text-red-400' },
              ].map(s => (
                <Card key={s.label} className="py-3">
                  <div className="flex items-center gap-2">
                    <s.icon size={14} className={s.color} />
                    <div>
                      <div className="text-sm font-bold text-white">{s.value}</div>
                      <div className="text-[10px] text-gray-500">{s.label}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Influencer Tiers ── */}
      {activeTab === 'tiers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TIERS.map(tier => (
            <Card key={tier.name} className={cn('border', tier.color)}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{tier.emoji}</span>
                <div>
                  <h3 className={cn('text-base font-bold', tier.accent)}>{tier.name}-influencer</h3>
                  <div className="text-xs text-gray-500">{tier.range} seguidores</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs font-bold text-white">{tier.costRange}</div>
                  <div className="text-[10px] text-gray-500">por post aprox.</div>
                </div>
              </div>

              <div className="flex gap-4 mb-3 text-xs">
                <div>
                  <span className="text-gray-500">Engagement: </span>
                  <span className={cn('font-bold', tier.accent)}>{tier.engagement}</span>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Ventajas</div>
                {tier.pros.map(p => (
                  <div key={p} className="flex items-center gap-1.5 text-xs text-gray-300 mb-1">
                    <Check size={11} className="text-emerald-400 flex-shrink-0" /> {p}
                  </div>
                ))}
              </div>
              <div className="mb-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Desventajas</div>
                {tier.cons.map(c => (
                  <div key={c} className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <ChevronRight size={11} className="text-red-400 flex-shrink-0" /> {c}
                  </div>
                ))}
              </div>
              <div className={cn('text-xs p-2 rounded-lg border mt-2', tier.color)}>
                <span className="text-gray-500">Ideal para: </span>
                <span className="text-gray-300">{tier.bestFor}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Media Kit ── */}
      {activeTab === 'mediakit' && (
        <div className="max-w-2xl space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">Tu Media Kit</h3>
              <span className="text-xs text-violet-400">{kitProgress}/{MEDIA_KIT_ITEMS.length} elementos</span>
            </div>
            <Progress value={(kitProgress / MEDIA_KIT_ITEMS.length) * 100} size="sm" className="mb-4" />

            {kitEssentialProgress < kitEssentialTotal && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                <Info size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-300">
                  Faltan {kitEssentialTotal - kitEssentialProgress} elementos esenciales. Las marcas los exigen para considerar una colaboración.
                </p>
              </div>
            )}
            {kitEssentialProgress === kitEssentialTotal && kitProgress === MEDIA_KIT_ITEMS.length && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <Star size={14} className="text-emerald-400" />
                <p className="text-xs text-emerald-300 font-medium">¡Media Kit completo! Listo para contactar marcas.</p>
              </div>
            )}

            <div className="space-y-2">
              {MEDIA_KIT_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setKitChecked(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className="w-full flex items-center gap-3 text-left group"
                >
                  <div className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    kitChecked[item.id] ? 'bg-violet-600 border-violet-600' : 'border-gray-600 group-hover:border-violet-400'
                  )}>
                    {kitChecked[item.id] && <Check size={11} className="text-white" />}
                  </div>
                  <span className={cn('text-sm flex-1', kitChecked[item.id] ? 'text-gray-600 line-through' : 'text-gray-300')}>
                    {item.label}
                  </span>
                  {item.essential && !kitChecked[item.id] && (
                    <Badge variant="warning" size="sm">Esencial</Badge>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Campaign Brief ── */}
      {activeTab === 'brief' && (
        <div className="max-w-2xl space-y-4">
          <div className="p-3 rounded-lg bg-[#0f0f1a] border border-[#1e1e35] text-xs text-gray-500">
            Usa este template para crear briefs profesionales que le des a influencers o agencias.
          </div>
          {BRIEF_SECTIONS.map(section => (
            <Card key={section.key}>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                {section.title}
              </label>
              <textarea
                value={brief[section.key] || ''}
                onChange={e => setBrief(prev => ({ ...prev, [section.key]: e.target.value }))}
                placeholder={section.placeholder}
                rows={2}
                className="w-full rounded-lg border border-[#1e1e35] bg-[#0a0a14] px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:border-violet-500/50 focus:outline-none transition-all"
              />
            </Card>
          ))}
          <Button
            icon={<BarChart2 size={14} />}
            onClick={() => {
              const text = BRIEF_SECTIONS.map(s => `**${s.title}**\n${brief[s.key] || '(pendiente)'}`).join('\n\n')
              navigator.clipboard.writeText(text)
            }}
          >
            Copiar Brief completo
          </Button>
        </div>
      )}
    </div>
  )
}
