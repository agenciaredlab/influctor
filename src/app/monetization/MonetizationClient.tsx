'use client'

import { useState, useMemo } from 'react'
import {
  DollarSign, TrendingUp, Users, Star, ChevronRight, Info,
  Check, Zap, Calculator, BarChart2, Target
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ---- Rate Calculator Engine ----
const PLATFORM_RATES: Record<string, Record<string, number>> = {
  instagram: { post: 15, story: 8, reel: 25, carousel: 18 },
  tiktok: { video: 20, live: 12, series: 30 },
  youtube: { video: 30, short: 10, integration: 50 },
  linkedin: { post: 25, article: 35, video: 40 },
  twitter: { tweet: 8, thread: 15 },
}

const NICHE_MULTIPLIERS: Record<string, { multiplier: number; label: string; examples: string }> = {
  finance: { multiplier: 2.5, label: 'Finanzas / Crypto', examples: 'inversiones, trading, ahorro, crypto' },
  tech: { multiplier: 2.2, label: 'Tecnología / SaaS', examples: 'software, gadgets, programación' },
  business: { multiplier: 2.0, label: 'Negocios / Emprendimiento', examples: 'startups, marketing, ventas' },
  health: { multiplier: 1.8, label: 'Salud / Wellness', examples: 'nutrición, fitness, mental health' },
  beauty: { multiplier: 1.5, label: 'Belleza / Skincare', examples: 'maquillaje, skincare, haircare' },
  fashion: { multiplier: 1.3, label: 'Moda / Estilo', examples: 'outfits, tendencias, streetwear' },
  food: { multiplier: 1.2, label: 'Gastronomía / Recetas', examples: 'cocina, restaurantes, recetas' },
  entertainment: { multiplier: 0.9, label: 'Entretenimiento / Humor', examples: 'memes, gaming, música' },
  lifestyle: { multiplier: 1.1, label: 'Lifestyle / Personal', examples: 'viajes, vlogs, daily life' },
}

const ENGAGEMENT_MULTIPLIERS = [
  { min: 5, max: 100, multiplier: 2.0, label: '> 5% — Excelente' },
  { min: 3, max: 5, multiplier: 1.5, label: '3-5% — Muy bueno' },
  { min: 1, max: 3, multiplier: 1.0, label: '1-3% — Promedio' },
  { min: 0, max: 1, multiplier: 0.7, label: '< 1% — Bajo' },
]

function calculateRate(followers: number, engagement: number, platform: string, format: string, niche: string) {
  const baseRatePer1K = PLATFORM_RATES[platform]?.[format] || 15
  const nicheMultiplier = NICHE_MULTIPLIERS[niche]?.multiplier || 1.0
  const engMultiplier = ENGAGEMENT_MULTIPLIERS.find(e => engagement >= e.min && engagement < e.max)?.multiplier || 1.0
  const followerBase = (followers / 1000) * baseRatePer1K

  const low = Math.round(followerBase * nicheMultiplier * engMultiplier * 0.8)
  const mid = Math.round(followerBase * nicheMultiplier * engMultiplier)
  const high = Math.round(followerBase * nicheMultiplier * engMultiplier * 1.4)
  return { low, mid, high }
}

const INCOME_STREAMS = [
  {
    id: 'brand_deals',
    title: 'Brand Deals & Patrocinios',
    icon: '🤝',
    followers: 1000,
    potential: 'Alto',
    potentialColor: 'text-emerald-400',
    effort: 'Medio',
    description: 'Colaborar con marcas para promocionar sus productos/servicios.',
    tips: [
      'Empieza contactando marcas pequeñas de tu nicho',
      'Crea un media kit profesional con tus métricas',
      'Cobra por deliverable, no por hora',
      'Mantén límites: solo promueve lo que usarías',
    ],
    minFollowers: '1,000 micro + alta engagement',
  },
  {
    id: 'affiliate',
    title: 'Marketing de Afiliados',
    icon: '🔗',
    followers: 500,
    potential: 'Medio',
    potentialColor: 'text-amber-400',
    effort: 'Bajo',
    description: 'Gana comisiones por cada venta generada con tu link único.',
    tips: [
      'Amazon, ClickBank, ShareASale para comenzar',
      'Enfócate en productos que ya usas y recomiendas',
      'Usa link-in-bio para centralizar todos tus links',
      'Los tutoriales y reviews convierten mejor',
    ],
    minFollowers: '500+ (sin mínimo real)',
  },
  {
    id: 'digital_products',
    title: 'Productos Digitales',
    icon: '💎',
    followers: 2000,
    potential: 'Muy Alto',
    potentialColor: 'text-violet-400',
    effort: 'Alto inicial',
    description: 'Vende cursos, templates, ebooks o presets creados por ti.',
    tips: [
      'Identifica el problema #1 de tu audiencia',
      'Empieza con algo simple: template o mini-guía',
      'Gumroad o Notion para vender sin código',
      'El margen es del 90%+, escala infinitamente',
    ],
    minFollowers: '2,000+ seguidores comprometidos',
  },
  {
    id: 'consulting',
    title: 'Consultoría / Coaching',
    icon: '🎯',
    followers: 3000,
    potential: 'Muy Alto',
    potentialColor: 'text-violet-400',
    effort: 'Alto',
    description: 'Cobra por tu tiempo y expertise en sesiones 1:1 o grupales.',
    tips: [
      'Nicho específico = tarifa más alta',
      'Empieza con sesiones 1:1 de 30 min ($50-200)',
      'Crea un programa grupal para escalar',
      'Posiciónate como experto antes de ofrecer',
    ],
    minFollowers: '3,000+ en tu nicho específico',
  },
  {
    id: 'memberships',
    title: 'Membresías / Suscripciones',
    icon: '⭐',
    followers: 5000,
    potential: 'Alto',
    potentialColor: 'text-emerald-400',
    effort: 'Medio-Alto',
    description: 'Ingresos recurrentes mensuales por acceso a contenido exclusivo.',
    tips: [
      'Patreon, Discord premium, Substack',
      'Ofrece contenido exclusivo que no compartes gratis',
      '$5-15/mes es el sweet spot de conversión',
      '100 suscriptores a $10 = $1,000/mes base',
    ],
    minFollowers: '5,000+ audiencia comprometida',
  },
  {
    id: 'adsense',
    title: 'AdSense / Fondo de Creadores',
    icon: '📺',
    followers: 10000,
    potential: 'Bajo-Medio',
    potentialColor: 'text-amber-400',
    effort: 'Bajo',
    description: 'Monetización directa por vistas/reproducciones de la plataforma.',
    tips: [
      'YouTube: $3-15 RPM según nicho',
      'TikTok: $0.02-0.04 por 1K vistas (bajo)',
      'Instagram Reels Bonus: varía por país',
      'No te bases solo en ads, combina fuentes',
    ],
    minFollowers: '10K YouTube / 100K TikTok',
  },
]

const MILESTONES = [
  { followers: 1000, label: '1,000 seguidores', unlocks: ['Brand deals micro', 'Afiliados', 'Primeros clientes coaching'], monthly: '$200-800' },
  { followers: 10000, label: '10,000 seguidores', unlocks: ['Brand deals small', 'Lanzar curso/producto', 'AdSense YouTube', 'Membresía'], monthly: '$1,000-3,000' },
  { followers: 50000, label: '50,000 seguidores', unlocks: ['Brand deals medianos', 'Programa grupal', 'Speaking / eventos', 'Collab con marcas top'], monthly: '$3,000-10,000' },
  { followers: 100000, label: '100K seguidores', unlocks: ['Brand deals grandes ($5K+)', 'Línea de productos propios', 'Agencia / equipo'], monthly: '$10,000-30,000' },
  { followers: 1000000, label: '1M seguidores', unlocks: ['Deals de 6 cifras', 'Venture capital interest', 'Licensing', 'Media deals'], monthly: '$30,000+' },
]

interface MonetizationClientProps {
  data: {
    totalFollowers: number
    avgEngagement: number
    thisMonthIncome: number
    byPlatform: Record<string, any>
    incomes: any[]
  }
}

export default function MonetizationClient({ data }: MonetizationClientProps) {
  const { totalFollowers, avgEngagement, thisMonthIncome, byPlatform } = data

  // Calculator state
  const [calcFollowers, setCalcFollowers] = useState(totalFollowers || 10000)
  const [calcEngagement, setCalcEngagement] = useState(avgEngagement || 3.5)
  const [calcPlatform, setCalcPlatform] = useState(Object.keys(byPlatform)[0] || 'instagram')
  const [calcNiche, setCalcNiche] = useState('lifestyle')
  const [activeTab, setActiveTab] = useState<'calculator' | 'streams' | 'roadmap'>('calculator')

  const calcPlatformFormats = Object.keys(PLATFORM_RATES[calcPlatform] || {})

  const rates = useMemo(() => {
    return calcPlatformFormats.reduce((acc, format) => {
      acc[format] = calculateRate(calcFollowers, calcEngagement, calcPlatform, format, calcNiche)
      return acc
    }, {} as Record<string, { low: number; mid: number; high: number }>)
  }, [calcFollowers, calcEngagement, calcPlatform, calcNiche])

  // Monthly potential
  const monthlyPotential = useMemo(() => {
    const mainFormat = calcPlatformFormats[0]
    const mainRate = rates[mainFormat]
    if (!mainRate) return { low: 0, mid: 0, high: 0 }
    // Assuming 2 deals/month + affiliate + other
    return {
      low: mainRate.low * 2 + Math.round(calcFollowers * 0.001),
      mid: mainRate.mid * 3 + Math.round(calcFollowers * 0.003),
      high: mainRate.high * 5 + Math.round(calcFollowers * 0.008),
    }
  }, [rates, calcPlatformFormats, calcFollowers])

  const currentMilestone = MILESTONES.find(m => totalFollowers < m.followers) || MILESTONES[MILESTONES.length - 1]
  const prevMilestone = MILESTONES[MILESTONES.indexOf(currentMilestone) - 1]
  const milestoneProgress = prevMilestone
    ? ((totalFollowers - prevMilestone.followers) / (currentMilestone.followers - prevMilestone.followers)) * 100
    : (totalFollowers / currentMilestone.followers) * 100

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Seguidores totales', value: formatNumber(totalFollowers), icon: Users, color: 'text-violet-400' },
          { label: 'Engagement prom.', value: `${avgEngagement.toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Ingresos este mes', value: formatCurrency(thisMonthIncome), icon: DollarSign, color: 'text-amber-400' },
          { label: 'Potencial mensual', value: formatCurrency(monthlyPotential.mid), icon: Star, color: 'text-pink-400' },
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

      {/* Milestone progress */}
      <Card className="border-amber-500/20 bg-gradient-to-r from-amber-950/20 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Próximo hito de monetización</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatNumber(currentMilestone.followers - totalFollowers)} seguidores para desbloquear: {currentMilestone.unlocks[0]}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-amber-400">{currentMilestone.monthly}</div>
            <div className="text-[10px] text-gray-500">potencial/mes</div>
          </div>
        </div>
        <Progress value={Math.min(100, milestoneProgress)} size="sm" color="amber" showLabel />
        <div className="flex justify-between mt-2 text-[10px] text-gray-600">
          <span>{formatNumber(totalFollowers)} actuales</span>
          <span>Meta: {formatNumber(currentMilestone.followers)}</span>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#1e1e35]">
        {[
          { key: 'calculator', label: '💰 Calculadora de Tarifas' },
          { key: 'streams', label: '🌊 Fuentes de Ingresos' },
          { key: 'roadmap', label: '🗺️ Roadmap de Monetización' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
              activeTab === tab.key
                ? 'text-violet-400 border-violet-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <Card>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Calculator size={15} className="text-violet-400" />
              Calculadora de Tarifas
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">Seguidores</label>
                <input
                  type="range" min={1000} max={5000000} step={1000}
                  value={calcFollowers}
                  onChange={(e) => setCalcFollowers(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-600">1K</span>
                  <span className="text-violet-400 font-bold text-sm">{formatNumber(calcFollowers)}</span>
                  <span className="text-gray-600">5M</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">
                  Engagement Rate: <span className="text-white">{calcEngagement.toFixed(1)}%</span>
                </label>
                <input
                  type="range" min={0.1} max={15} step={0.1}
                  value={calcEngagement}
                  onChange={(e) => setCalcEngagement(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-600">0.1%</span>
                  <span className={cn(
                    'font-medium',
                    calcEngagement >= 5 ? 'text-emerald-400' : calcEngagement >= 3 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {ENGAGEMENT_MULTIPLIERS.find(e => calcEngagement >= e.min && calcEngagement < e.max)?.label}
                  </span>
                  <span className="text-gray-600">15%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Plataforma</label>
                  <select
                    value={calcPlatform}
                    onChange={(e) => setCalcPlatform(e.target.value)}
                    className="w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                  >
                    {Object.keys(PLATFORM_RATES).map(p => (
                      <option key={p} value={p} className="bg-[#0f0f1a] capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Nicho</label>
                  <select
                    value={calcNiche}
                    onChange={(e) => setCalcNiche(e.target.value)}
                    className="w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                  >
                    {Object.entries(NICHE_MULTIPLIERS).map(([key, n]) => (
                      <option key={key} value={key} className="bg-[#0f0f1a]">{n.label} ({n.multiplier}x)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Niche tip */}
              <div className="bg-[#0f0f1a] rounded-lg p-3 border border-[#1e1e35]">
                <div className="flex items-start gap-2">
                  <Info size={12} className="text-violet-400 mt-0.5 flex-shrink-0" />
                  <div className="text-[11px] text-gray-500">
                    <span className="text-violet-400 font-medium">Nicho: {NICHE_MULTIPLIERS[calcNiche]?.label}</span>
                    <br />Multiplicador: {NICHE_MULTIPLIERS[calcNiche]?.multiplier}x · Ejemplos: {NICHE_MULTIPLIERS[calcNiche]?.examples}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {/* Per format rates */}
            <Card>
              <h3 className="text-sm font-bold text-white mb-4">Tarifas por formato</h3>
              <div className="space-y-3">
                {Object.entries(rates).map(([format, rate]) => (
                  <div key={format} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 capitalize">{format}</span>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-xs text-gray-600">{formatCurrency(rate.low)}</span>
                      <span className="text-sm font-bold text-white">{formatCurrency(rate.mid)}</span>
                      <span className="text-xs text-gray-600">{formatCurrency(rate.high)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-gray-600 border-t border-[#1e1e35] pt-2">
                <span>Mínimo</span>
                <span>Mercado promedio</span>
                <span>Premium</span>
              </div>
            </Card>

            {/* Monthly potential */}
            <Card className="border-emerald-500/20 bg-emerald-950/10">
              <h3 className="text-sm font-bold text-white mb-3">Potencial mensual estimado</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Conservador', value: monthlyPotential.low, color: 'text-gray-300' },
                  { label: 'Realista', value: monthlyPotential.mid, color: 'text-emerald-400' },
                  { label: 'Optimista', value: monthlyPotential.high, color: 'text-amber-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-[#0f0f1a] rounded-lg p-3 border border-[#1a1a2e]">
                    <div className={cn('text-xl font-black', s.color)}>{formatCurrency(s.value)}</div>
                    <div className="text-[10px] text-gray-600 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-3 text-center">
                Basado en 2-5 brand deals/mes + afiliados + otras fuentes
              </p>
            </Card>

            {/* Annual projection */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Proyección anual</div>
                  <div className="text-2xl font-black text-white">{formatCurrency(monthlyPotential.mid * 12)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">vs. ingresos actuales</div>
                  <div className={cn(
                    'text-sm font-bold',
                    monthlyPotential.mid > (data.thisMonthIncome || 0) ? 'text-emerald-400' : 'text-gray-400'
                  )}>
                    {monthlyPotential.mid > (data.thisMonthIncome || 0)
                      ? `+${formatCurrency(monthlyPotential.mid - (data.thisMonthIncome || 0))}/mes`
                      : 'Ya alcanzado'
                    }
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Income Streams Tab */}
      {activeTab === 'streams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {INCOME_STREAMS.map((stream) => {
            const isUnlocked = totalFollowers >= stream.followers
            return (
              <Card key={stream.id} className={cn(!isUnlocked && 'opacity-60')}>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">{stream.icon}</div>
                  <div className="flex items-center gap-1.5">
                    {isUnlocked
                      ? <Badge variant="success" dot>Disponible</Badge>
                      : <Badge variant="default">{formatNumber(stream.followers)}+ requeridos</Badge>
                    }
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{stream.title}</h3>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{stream.description}</p>

                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('text-xs font-semibold', stream.potentialColor)}>
                    {stream.potential}
                  </span>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-500">Esfuerzo: {stream.effort}</span>
                </div>

                <div className="border-t border-[#1e1e35] pt-3 space-y-1.5">
                  {stream.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <Check size={11} className="text-violet-400 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-gray-500">{tip}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Roadmap Tab */}
      {activeTab === 'roadmap' && (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-[#1e1e35]" />
          <div className="space-y-6 pl-14">
            {MILESTONES.map((milestone, i) => {
              const isAchieved = totalFollowers >= milestone.followers
              const isCurrent = !isAchieved && (i === 0 || totalFollowers >= MILESTONES[i - 1].followers)
              return (
                <div key={milestone.followers} className="relative">
                  {/* Dot */}
                  <div className={cn(
                    'absolute -left-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                    isAchieved
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : isCurrent
                      ? 'border-violet-500 bg-violet-500/20 text-violet-400 animate-pulse-slow'
                      : 'border-[#1e1e35] bg-[#0f0f1a] text-gray-600'
                  )}>
                    {isAchieved
                      ? <Check size={14} />
                      : <span className="text-[10px] font-bold">{i + 1}</span>
                    }
                  </div>

                  <Card className={cn(isCurrent && 'border-violet-500/30 bg-violet-950/10')}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={cn('text-sm font-bold', isAchieved ? 'text-emerald-400' : isCurrent ? 'text-violet-300' : 'text-gray-400')}>
                            {milestone.label}
                          </h3>
                          {isCurrent && <Badge variant="purple" dot>Siguiente hito</Badge>}
                          {isAchieved && <Badge variant="success" dot>Alcanzado</Badge>}
                        </div>
                        <div className={cn('text-lg font-black', isAchieved ? 'text-white' : 'text-gray-500')}>
                          {milestone.monthly}/mes
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {milestone.unlocks.map((unlock) => (
                        <span
                          key={unlock}
                          className={cn(
                            'text-[11px] px-2 py-0.5 rounded-full border',
                            isAchieved
                              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
                              : 'border-[#1e1e35] bg-[#0f0f1a] text-gray-500'
                          )}
                        >
                          {isAchieved ? '✓ ' : ''}{unlock}
                        </span>
                      ))}
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
