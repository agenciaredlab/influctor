'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, BookOpen, Lock, Trophy } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import { cn } from '@/lib/utils'

const PLAYBOOKS = [
  {
    id: '0-1k',
    title: '0 → 1,000 seguidores',
    emoji: '🌱',
    range: [0, 1000],
    color: 'border-emerald-500/30',
    accent: 'text-emerald-400',
    steps: [
      { id: 'niche', text: 'Define tu nicho en una oración. Sé específico, no "fitness" sino "fitness para mamás de 30+"' },
      { id: 'profile', text: 'Optimiza tu bio: quién eres, a quién ayudas, qué publicar. Incluye un CTA claro' },
      { id: 'content-pillars', text: 'Establece 3 pilares de contenido que rotan semanalmente' },
      { id: 'first-10', text: 'Publica 10 posts antes de pensar en crecer. Aprende qué funciona' },
      { id: 'engage-daily', text: 'Dedica 30 min/día a comentar en cuentas grandes de tu nicho (valor real)' },
      { id: 'hashtags', text: 'Usa hashtags de nicho pequeño (10K-200K posts), no los gigantes' },
      { id: 'consistency', text: 'Compromete con 3-4 posts/semana durante 60 días sin parar' },
      { id: 'reels', text: 'Prioriza Reels/TikToks sobre posts estáticos. El alcance orgánico es 10x mayor' },
    ],
  },
  {
    id: '1k-10k',
    title: '1K → 10,000 seguidores',
    emoji: '📈',
    range: [1000, 10000],
    color: 'border-blue-500/30',
    accent: 'text-blue-400',
    steps: [
      { id: 'best-content', text: 'Identifica tus 3 posts con más engagement y haz 10 variaciones de cada uno' },
      { id: 'collab', text: 'Haz 1 colaboración/mes con cuentas de tamaño similar o ligeramente mayor' },
      { id: 'series', text: 'Crea una serie de contenido recurrente (ej: "Lunes de tips") para generar expectativa' },
      { id: 'saves', text: 'Enfócate en contenido que se guarda: tutoriales, listas, guías de referencia' },
      { id: 'stories-daily', text: 'Stories todos los días: muestra el proceso, encuestas, Q&A. Humaniza tu cuenta' },
      { id: 'cta', text: 'Incluye un CTA en cada post: "guarda esto", "comparte con alguien que...", "comenta X"' },
      { id: 'analytics', text: 'Revisa analytics cada semana. Dobla lo que funciona, elimina lo que no' },
      { id: 'email', text: 'Empieza a capturar emails ahora. Tu lista es tuya, el algoritmo no' },
    ],
  },
  {
    id: '10k-100k',
    title: '10K → 100,000 seguidores',
    emoji: '🚀',
    range: [10000, 100000],
    color: 'border-violet-500/30',
    accent: 'text-violet-400',
    steps: [
      { id: 'hook-mastery', text: 'Domina los hooks. Prueba 5 variantes distintas del mismo contenido para encontrar la ganadora' },
      { id: 'viral-format', text: 'Identifica el formato que más crece en tu nicho y publícalo 3x/semana' },
      { id: 'big-collabs', text: 'Busca colaboraciones con cuentas 3-5x más grandes que la tuya' },
      { id: 'trending', text: 'Monitorea tendencias y publícalas en las primeras 24h de que aparecen' },
      { id: 'media-kit', text: 'Crea tu media kit y empieza a prospectar brand deals activamente' },
      { id: 'community', text: 'Construye comunidad real: responde todos los comentarios, crea grupos o Discord' },
      { id: 'repurpose', text: 'Repurposea cada pieza de contenido en 3 plataformas distintas' },
      { id: 'systems', text: 'Crea sistemas y batching: graba 1 día, edita 1 día, publica el resto de la semana' },
    ],
  },
  {
    id: 'monetize',
    title: 'Monetización (desde 1K)',
    emoji: '💰',
    range: [1000, Infinity],
    color: 'border-amber-500/30',
    accent: 'text-amber-400',
    steps: [
      { id: 'media-kit-mon', text: 'Crea un media kit profesional con: métricas, audiencia, tarifas y casos de éxito' },
      { id: 'first-deal', text: 'Contacta 20 marcas pequeñas de tu nicho. Ofrece tu primera colaboración con descuento' },
      { id: 'affiliate', text: 'Regístrate en Amazon Afiliados, ShareASale y 2-3 programas de tu nicho esta semana' },
      { id: 'link-bio', text: 'Configura Linktree o similar con todos tus links de afiliado y formas de contacto' },
      { id: 'digital-product', text: 'Crea un producto digital simple: PDF, template o mini-guía. Véndelo en Gumroad' },
      { id: 'rate-card', text: 'Define tus tarifas por formato y plataforma. Nunca trabajes sin precio claro' },
      { id: 'invoice', text: 'Formaliza tus cobros: factura, contrato básico, método de pago claro' },
      { id: 'diversify', text: 'Nunca dependas de una sola fuente. Meta: 3+ fuentes de ingreso activas' },
    ],
  },
  {
    id: 'business',
    title: 'De Creador a Empresa',
    emoji: '🏢',
    range: [50000, Infinity],
    color: 'border-pink-500/30',
    accent: 'text-pink-400',
    steps: [
      { id: 'team', text: 'Contrata tu primer asistente/editor freelance. Tu tiempo vale más que el costo' },
      { id: 'brand', text: 'Formaliza tu marca personal: nombre comercial, logo, colores, guía de estilo' },
      { id: 'own-product', text: 'Lanza tu producto/servicio propio: curso, membresía, coaching, consultoría' },
      { id: 'agency', text: 'Evalúa crear una micro-agencia: gestiona otras cuentas con tu método' },
      { id: 'licensing', text: 'Explora licensing de contenido y partnerships estratégicos a largo plazo' },
      { id: 'revenue-streams', text: 'Meta: 5+ fuentes de ingreso. Calcula tu MRR (ingreso mensual recurrente)' },
      { id: 'legal', text: 'Registra tu empresa, abre cuenta bancaria de negocios, separa finanzas personales' },
      { id: 'scale', text: 'Documenta todos tus procesos para poder delegar y escalar sin ti' },
    ],
  },
]

interface Props {
  userId: string
  totalFollowers: number
  savedProgress: { playbookId: string; checklistId: string; completed: boolean }[]
}

export default function PlaybooksClient({ userId, totalFollowers, savedProgress }: Props) {
  const [expanded, setExpanded] = useState<string | null>('0-1k')
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const p of savedProgress) {
      map[`${p.playbookId}:${p.checklistId}`] = p.completed
    }
    return map
  })
  const [saving, setSaving] = useState<string | null>(null)

  const toggle = async (playbookId: string, stepId: string) => {
    const key = `${playbookId}:${stepId}`
    const next = !checked[key]
    setChecked(prev => ({ ...prev, [key]: next }))
    setSaving(key)
    try {
      await fetch('/api/playbooks/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, playbookId, checklistId: stepId, completed: next }),
      })
    } finally {
      setSaving(null)
    }
  }

  const getProgress = (pb: typeof PLAYBOOKS[0]) => {
    const done = pb.steps.filter(s => checked[`${pb.id}:${s.id}`]).length
    return { done, total: pb.steps.length, pct: Math.round((done / pb.steps.length) * 100) }
  }

  const isUnlocked = (pb: typeof PLAYBOOKS[0]) =>
    totalFollowers >= pb.range[0] || pb.id === 'monetize' || pb.id === '0-1k'

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header info */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-[#1e1e35] bg-[#0f0f1a]">
        <BookOpen size={20} className="text-violet-400" />
        <div>
          <p className="text-sm font-medium text-white">
            Tus seguidores actuales: <span className="text-violet-400">{totalFollowers.toLocaleString()}</span>
          </p>
          <p className="text-xs text-gray-500">Completa cada checklist para avanzar de etapa</p>
        </div>
      </div>

      {/* Playbooks */}
      {PLAYBOOKS.map(pb => {
        const prog = getProgress(pb)
        const unlocked = isUnlocked(pb)
        const open = expanded === pb.id

        return (
          <Card key={pb.id} className={cn('border', pb.color, !unlocked && 'opacity-50')}>
            {/* Header */}
            <button
              className="w-full flex items-center gap-3 text-left"
              onClick={() => unlocked && setExpanded(open ? null : pb.id)}
              disabled={!unlocked}
            >
              <span className="text-2xl">{pb.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{pb.title}</span>
                  {!unlocked && <Lock size={12} className="text-gray-600" />}
                  {prog.done === prog.total && prog.total > 0 && (
                    <Trophy size={13} className="text-amber-400" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={prog.pct} size="xs" className="w-32" />
                  <span className={cn('text-xs font-medium', pb.accent)}>
                    {prog.done}/{prog.total} completados
                  </span>
                </div>
              </div>
              {unlocked && (
                open ? <ChevronUp size={16} className="text-gray-500 flex-shrink-0" />
                      : <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
              )}
            </button>

            {/* Steps */}
            {open && unlocked && (
              <div className="mt-4 space-y-2 border-t border-[#1e1e35] pt-4">
                {pb.steps.map((step, i) => {
                  const key = `${pb.id}:${step.id}`
                  const done = !!checked[key]
                  const isSaving = saving === key
                  return (
                    <button
                      key={step.id}
                      onClick={() => toggle(pb.id, step.id)}
                      className="w-full flex items-start gap-3 text-left group"
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                        done
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-600 group-hover:border-violet-400'
                      )}>
                        {done && <Check size={11} className="text-white" />}
                        {isSaving && !done && (
                          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                        )}
                      </div>
                      <span className={cn(
                        'text-sm leading-relaxed transition-colors',
                        done ? 'text-gray-600 line-through' : 'text-gray-300 group-hover:text-white'
                      )}>
                        <span className="text-gray-600 mr-1">{i + 1}.</span>
                        {step.text}
                      </span>
                    </button>
                  )
                })}

                {prog.done === prog.total && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <Trophy size={20} className="text-amber-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-amber-400">¡Playbook completado!</p>
                    <p className="text-xs text-gray-500 mt-0.5">Pasa al siguiente nivel</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
