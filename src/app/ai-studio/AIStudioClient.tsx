'use client'

import { useState } from 'react'
import {
  Sparkles, Hash, FileText, Lightbulb, BookOpen, BarChart2,
  Copy, Check, Star, Trash2, Loader2, Send, RefreshCw,
  ChevronDown, Image, MessageSquare, Zap
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

type AITool = {
  key: string
  label: string
  icon: any
  color: string
  bg: string
  description: string
  placeholder: string
  fields: FieldConfig[]
}

type FieldConfig = {
  key: string
  label: string
  type: 'textarea' | 'select' | 'input'
  placeholder?: string
  options?: { value: string; label: string }[]
  required?: boolean
}

const AI_TOOLS: AITool[] = [
  {
    key: 'caption',
    label: 'Caption Generator',
    icon: MessageSquare,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    description: 'Genera captions atractivos y con engagement para tus posts',
    placeholder: 'Describe tu foto o video...',
    fields: [
      { key: 'topic', label: 'Describe tu contenido', type: 'textarea', placeholder: 'Ej: Una foto de un atardecer en la playa con mi grupo de amigos celebrando el fin de semana...', required: true },
      { key: 'platform', label: 'Plataforma', type: 'select', options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'twitter', label: 'Twitter/X' },
      ]},
      { key: 'tone', label: 'Tono', type: 'select', options: [
        { value: 'casual', label: 'Casual y amigable' },
        { value: 'professional', label: 'Profesional' },
        { value: 'funny', label: 'Divertido y con humor' },
        { value: 'inspirational', label: 'Inspiracional' },
        { value: 'educational', label: 'Educativo' },
      ]},
      { key: 'length', label: 'Longitud', type: 'select', options: [
        { value: 'short', label: 'Corto (1-2 líneas)' },
        { value: 'medium', label: 'Medio (3-5 líneas)' },
        { value: 'long', label: 'Largo (storytelling)' },
      ]},
    ],
  },
  {
    key: 'hashtags',
    label: 'Hashtag Optimizer',
    icon: Hash,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    description: 'Encuentra los mejores hashtags para maximizar tu alcance',
    placeholder: 'Tema o nicho de tu contenido...',
    fields: [
      { key: 'topic', label: 'Tema del contenido', type: 'textarea', placeholder: 'Ej: fitness, nutrición deportiva, entrenamiento en casa para principiantes', required: true },
      { key: 'platform', label: 'Plataforma', type: 'select', options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'twitter', label: 'Twitter/X' },
        { value: 'linkedin', label: 'LinkedIn' },
      ]},
      { key: 'strategy', label: 'Estrategia', type: 'select', options: [
        { value: 'balanced', label: 'Balanceada (mix de tamaños)' },
        { value: 'niche', label: 'Nicho específico (menor competencia)' },
        { value: 'trending', label: 'Tendencia (mayor alcance)' },
      ]},
    ],
  },
  {
    key: 'bio',
    label: 'Bio Optimizer',
    icon: FileText,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    description: 'Optimiza tu bio para convertir visitantes en seguidores',
    placeholder: 'Describe quién eres y qué haces...',
    fields: [
      { key: 'topic', label: '¿Quién eres y qué haces?', type: 'textarea', placeholder: 'Ej: Soy entrenadora personal especializada en pérdida de peso para mamás ocupadas. Ayudo a recuperar la confianza a través del ejercicio y la nutrición...', required: true },
      { key: 'platform', label: 'Plataforma', type: 'select', options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'twitter', label: 'Twitter/X' },
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'youtube', label: 'YouTube' },
      ]},
      { key: 'goal', label: 'Objetivo de la bio', type: 'select', options: [
        { value: 'followers', label: 'Ganar seguidores' },
        { value: 'clients', label: 'Conseguir clientes' },
        { value: 'collaborations', label: 'Atraer colaboraciones' },
        { value: 'traffic', label: 'Generar tráfico web' },
      ]},
    ],
  },
  {
    key: 'content_ideas',
    label: 'Ideas de Contenido',
    icon: Lightbulb,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    description: 'Genera ideas frescas y relevantes para tu siguiente contenido',
    placeholder: 'Tu nicho o tema principal...',
    fields: [
      { key: 'topic', label: 'Tu nicho/tema', type: 'textarea', placeholder: 'Ej: Marketing digital para pequeños negocios, especialmente e-commerce de ropa', required: true },
      { key: 'platform', label: 'Plataforma', type: 'select', options: [
        { value: 'instagram', label: 'Instagram (Reels + Stories)' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'youtube', label: 'YouTube' },
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'multi', label: 'Multi-plataforma' },
      ]},
      { key: 'count', label: 'Cantidad de ideas', type: 'select', options: [
        { value: '5', label: '5 ideas' },
        { value: '10', label: '10 ideas' },
        { value: '15', label: '15 ideas (calendario mensual)' },
      ]},
    ],
  },
  {
    key: 'strategy',
    label: 'Estrategia de Crecimiento',
    icon: BarChart2,
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    description: 'Plan personalizado para crecer en redes sociales',
    placeholder: 'Cuéntame sobre tu situación actual...',
    fields: [
      { key: 'topic', label: 'Situación actual', type: 'textarea', placeholder: 'Ej: Tengo 5,000 seguidores en Instagram, publico 3 veces por semana sobre recetas veganas, mi engagement es del 2% y quiero llegar a 50K en 6 meses...', required: true },
      { key: 'platform', label: 'Plataforma principal', type: 'select', options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'youtube', label: 'YouTube' },
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'multi', label: 'Multi-plataforma' },
      ]},
      { key: 'goal', label: 'Objetivo principal', type: 'select', options: [
        { value: 'followers', label: 'Crecer seguidores' },
        { value: 'engagement', label: 'Mejorar engagement' },
        { value: 'monetize', label: 'Monetizar' },
        { value: 'brand', label: 'Construir marca personal' },
      ]},
    ],
  },
  {
    key: 'analysis',
    label: 'Análisis de Competencia',
    icon: BookOpen,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    description: 'Analiza tu competencia y encuentra oportunidades de diferenciación',
    placeholder: 'Describe tu nicho y competidores...',
    fields: [
      { key: 'topic', label: 'Tu nicho y competidores', type: 'textarea', placeholder: 'Ej: Soy coach de finanzas personales, mis principales competidores son perfiles de Instagram con 100K-500K seguidores que enseñan ahorro e inversión...', required: true },
      { key: 'platform', label: 'Plataforma', type: 'select', options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'youtube', label: 'YouTube' },
        { value: 'linkedin', label: 'LinkedIn' },
      ]},
    ],
  },
]

interface AIStudioClientProps {
  userId: string
  history: any[]
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-400 transition-colors"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export default function AIStudioClient({ userId, history: initialHistory }: AIStudioClientProps) {
  const [activeTool, setActiveTool] = useState<string>('caption')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState(initialHistory)
  const [saved, setSaved] = useState(false)

  const currentTool = AI_TOOLS.find(t => t.key === activeTool)!

  const handleGenerate = async () => {
    const topicField = fields.topic
    if (!topicField?.trim()) return

    setLoading(true)
    setResult('')
    setSaved(false)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTool,
          fields,
          userId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data.result)
        // Add to local history
        setHistory(prev => [{
          id: Date.now().toString(),
          type: activeTool,
          prompt: topicField,
          result: data.result,
          platform: fields.platform || null,
          saved: false,
          createdAt: new Date(),
        }, ...prev].slice(0, 20))
      } else {
        const error = await res.json()
        setResult(`Error: ${error.error || 'No se pudo generar el contenido. Verifica tu API key de Anthropic.'}`)
      }
    } catch (e) {
      setResult('Error de conexión. Verifica que el servidor esté corriendo.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaved(true)
    // Optionally save to history
  }

  const handleFieldChange = (key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  const typeLabels: Record<string, string> = {
    caption: 'Caption',
    hashtags: 'Hashtags',
    bio: 'Bio',
    content_ideas: 'Ideas',
    strategy: 'Estrategia',
    analysis: 'Análisis',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* Tool selector sidebar */}
      <div className="lg:col-span-1">
        <Card className="p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Herramientas IA</h3>
          <div className="space-y-1">
            {AI_TOOLS.map((tool) => {
              const Icon = tool.icon
              const isActive = activeTool === tool.key
              return (
                <button
                  key={tool.key}
                  onClick={() => {
                    setActiveTool(tool.key)
                    setResult('')
                    setFields({})
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left',
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  )}
                >
                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', tool.bg)}>
                    <Icon size={14} className={tool.color} />
                  </div>
                  <span className="font-medium text-xs">{tool.label}</span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* History */}
        {history.length > 0 && (
          <Card className="mt-4 p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Historial</h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTool(item.type)
                    setResult(item.result)
                    setFields({ topic: item.prompt, platform: item.platform || '' })
                  }}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge variant="purple" size="sm" className="text-[9px]">
                      {typeLabels[item.type] || item.type}
                    </Badge>
                    {item.saved && <Star size={10} className="text-amber-400" />}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{item.prompt}</p>
                  <p className="text-[10px] text-gray-700 mt-0.5">
                    {format(new Date(item.createdAt), 'd MMM HH:mm', { locale: es })}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Main area */}
      <div className="lg:col-span-3 space-y-4">
        {/* Tool header */}
        <Card>
          <div className="flex items-start gap-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', currentTool.bg)}>
              <currentTool.icon size={22} className={currentTool.color} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">{currentTool.label}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{currentTool.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="purple" dot>Powered by Claude</Badge>
            </div>
          </div>
        </Card>

        {/* Input form */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Configuración</h3>
          <div className="space-y-4">
            {currentTool.fields.map((field) => {
              if (field.type === 'textarea') {
                return (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">{field.label}</label>
                    <textarea
                      value={fields[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={4}
                      className="w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all"
                    />
                  </div>
                )
              }
              if (field.type === 'select' && field.options) {
                return (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-300">{field.label}</label>
                    <select
                      value={fields[field.key] || field.options[0].value}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2.5 text-sm text-white focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all"
                    >
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0f0f1a]">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              }
              return null
            })}
          </div>

          <div className="flex items-center gap-3 mt-5">
            <Button
              onClick={handleGenerate}
              loading={loading}
              disabled={!fields.topic?.trim()}
              icon={loading ? undefined : <Sparkles size={15} />}
              className="flex-1"
            >
              {loading ? 'Generando con IA...' : 'Generar con IA'}
            </Button>
            {result && (
              <Button
                variant="secondary"
                onClick={() => { setResult(''); setFields({}) }}
                icon={<RefreshCw size={14} />}
              >
                Limpiar
              </Button>
            )}
          </div>
        </Card>

        {/* Result */}
        {loading && (
          <Card>
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 size={20} className="animate-spin text-violet-400" />
              <span className="text-gray-400 text-sm">Claude está generando tu contenido...</span>
            </div>
          </Card>
        )}

        {result && !loading && (
          <Card className="animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Resultado generado</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  className={cn(
                    'flex items-center gap-1.5 text-xs transition-colors',
                    saved ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400'
                  )}
                >
                  <Star size={13} className={saved ? 'fill-amber-400' : ''} />
                  {saved ? 'Guardado' : 'Guardar'}
                </button>
                <CopyButton text={result} />
              </div>
            </div>
            <div className="bg-[#0a0a14] rounded-lg p-4 border border-[#1a1a2e]">
              <pre className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
                {result}
              </pre>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#1e1e35]">
              <span className="text-xs text-gray-600">Acciones rápidas:</span>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-400 transition-colors"
              >
                <RefreshCw size={11} /> Regenerar
              </button>
              <span className="text-gray-700">·</span>
              <button
                onClick={() => {
                  setActiveTool('hashtags')
                  setFields(prev => ({ ...prev, topic: prev.topic || '' }))
                  setResult('')
                }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-cyan-400 transition-colors"
              >
                <Hash size={11} /> Generar hashtags para esto
              </button>
            </div>
          </Card>
        )}

        {/* Tips when empty */}
        {!result && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Zap, title: 'Tip: Sé específico', desc: 'Cuanta más información le des a la IA, mejor será el resultado generado.' },
              { icon: RefreshCw, title: 'Tip: Regenera', desc: 'Si no te gusta el resultado, regenera para obtener diferentes versiones.' },
              { icon: Copy, title: 'Tip: Personaliza', desc: 'Usa el resultado como base y añade tu toque personal antes de publicar.' },
            ].map((tip) => (
              <Card key={tip.title} className="text-center py-6">
                <tip.icon size={20} className="text-gray-600 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-gray-400 mb-1">{tip.title}</h4>
                <p className="text-xs text-gray-600">{tip.desc}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
