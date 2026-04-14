'use client'

import { useState } from 'react'
import { Mail, Copy, CheckCheck, ChevronRight, Plus, Trash2, Clock, CheckCircle, XCircle, Send, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const TEMPLATES = [
  {
    id: 'first-contact',
    category: 'Primer contacto',
    label: 'Email inicial a marca',
    subject: 'Colaboración {{MARCA}} x {{TU_NOMBRE}} — {{PLATAFORMA}}',
    body: `Hola equipo de {{MARCA}},

Mi nombre es {{TU_NOMBRE}}, soy creador de contenido en {{PLATAFORMA}} con {{SEGUIDORES}} seguidores en el nicho de {{NICHO}}.

He seguido a {{MARCA}} por un tiempo y creo que existe una sinergia real entre mi audiencia y su producto. Mi comunidad está compuesta principalmente por {{AUDIENCIA}}, exactamente el perfil que {{MARCA}} busca alcanzar.

Algunos números rápidos:
• Seguidores: {{SEGUIDORES}}
• Engagement rate: {{ENGAGEMENT}}%
• Alcance mensual promedio: {{ALCANCE}}

Me gustaría proponer una colaboración de contenido patrocinado. ¿Podríamos agendar una llamada de 15 minutos esta semana para explorar las posibilidades?

Adjunto mi media kit completo para tu revisión.

Saludos,
{{TU_NOMBRE}}
{{LINK_PERFIL}}`,
    tags: ['frío', 'marca', 'propuesta'],
    rating: 4.8,
  },
  {
    id: 'follow-up',
    category: 'Follow-up',
    label: 'Seguimiento sin respuesta',
    subject: 'Re: Colaboración {{MARCA}} x {{TU_NOMBRE}}',
    body: `Hola {{NOMBRE_CONTACTO}},

Espero que estés bien. Te escribo para hacer seguimiento de mi email anterior sobre una posible colaboración.

Entiendo que reciben muchas propuestas, por eso quiero ser breve: vi que {{MARCA}} lanzó recientemente {{PRODUCTO_RECIENTE}} y creo que puedo ayudarles a llegar a {{AUDIENCIA}} de forma auténtica.

He trabajado con marcas similares como {{REFERENCIA}} con resultados de {{RESULTADO_EJEMPLO}}.

¿Hay alguien más en tu equipo con quien deba hablar?

Gracias por tu tiempo,
{{TU_NOMBRE}}`,
    tags: ['seguimiento', 'frío'],
    rating: 4.5,
  },
  {
    id: 'negotiation',
    category: 'Negociación',
    label: 'Propuesta de tarifas',
    subject: 'Propuesta Formal — Colaboración {{MARCA}}',
    body: `Hola {{NOMBRE_CONTACTO}},

Gracias por tu interés en colaborar. Aquí te detallo mi propuesta:

ENTREGABLES:
• {{ENTREGABLE_1}} (ej: 1 Reel + 3 Stories)
• {{ENTREGABLE_2}} (ej: Mención en bio por 30 días)
• {{ENTREGABLE_3}} (ej: 1 post en feed)

INVERSIÓN: {{TARIFA}} USD

INCLUYE:
✓ Contenido 100% original y auténtico
✓ Derechos de uso por 30 días
✓ Reporte de métricas post-publicación
✓ Revisión previa al lanzamiento

TIMELINE:
• Aprobación de brief: {{FECHA_INICIO}}
• Entrega de borrador: +5 días
• Publicación: {{FECHA_PUBLICACION}}

¿Tienes alguna pregunta sobre la propuesta? Estoy disponible para ajustar los entregables según tu presupuesto.

{{TU_NOMBRE}}`,
    tags: ['negociación', 'propuesta', 'tarifas'],
    rating: 4.9,
  },
  {
    id: 'post-collab',
    category: 'Post-colaboración',
    label: 'Reporte de resultados',
    subject: 'Reporte de Resultados — Campaña {{MARCA}}',
    body: `Hola {{NOMBRE_CONTACTO}},

La campaña ha concluido y quiero compartirte los resultados:

MÉTRICAS FINALES:
📊 Alcance total: {{ALCANCE_FINAL}}
👁️ Impresiones: {{IMPRESIONES}}
❤️ Engagement total: {{ENGAGEMENT_TOTAL}} ({{ENGAGEMENT_RATE}}%)
🔗 Clics al link: {{CLICS}}
💬 Comentarios destacados: {{COMENTARIOS}}

HIGHLIGHTS:
• {{HIGHLIGHT_1}}
• {{HIGHLIGHT_2}}

Ha sido una colaboración muy exitosa. Me encantaría repetirla o explorar nuevos formatos juntos.

¿Podemos agendar una llamada para revisar los resultados y planear el siguiente paso?

{{TU_NOMBRE}}`,
    tags: ['reporte', 'resultados', 'post-collab'],
    rating: 4.7,
  },
  {
    id: 'agency',
    category: 'Agencia',
    label: 'Contactar agencia de talentos',
    subject: 'Representación — {{TU_NOMBRE}}, {{SEGUIDORES}} seguidores en {{PLATAFORMA}}',
    body: `Hola equipo de {{AGENCIA}},

Soy {{TU_NOMBRE}}, creador de contenido en {{PLATAFORMA}} enfocado en {{NICHO}}.

Actualmente manejo mis colaboraciones de forma independiente, pero busco una agencia que me ayude a profesionalizar mi carrera y acceder a marcas de mayor nivel.

Mi situación actual:
• {{SEGUIDORES}} seguidores en {{PLATAFORMA}}
• Engagement: {{ENGAGEMENT}}%
• Ingresos mensuales actuales: ~{{INGRESOS}} USD
• Colaboraciones previas: {{MARCAS_PREVIAS}}

Mi objetivo es {{OBJETIVO_CARRERA}} en los próximos 12 meses.

¿Estarían abiertos a evaluar una posible representación?

{{TU_NOMBRE}}
{{LINK_PERFIL}}`,
    tags: ['agencia', 'representación'],
    rating: 4.3,
  },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Enviado', color: 'text-amber-400 bg-amber-500/10', icon: Send },
  { value: 'opened', label: 'Abierto', color: 'text-blue-400 bg-blue-500/10', icon: Clock },
  { value: 'replied', label: 'Respondió', color: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle },
  { value: 'declined', label: 'Rechazado', color: 'text-red-400 bg-red-500/10', icon: XCircle },
]

interface OutreachEntry {
  id: string
  brand: string
  contact: string
  template: string
  status: string
  sentAt: string
  notes: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a2e] hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-xs transition-colors">
      {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export default function OutreachClient() {
  const [activeTab, setActiveTab] = useState<'templates' | 'tracker'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0])
  const [filterCat, setFilterCat] = useState('Todos')
  const [tracker, setTracker] = useState<OutreachEntry[]>([
    { id: '1', brand: 'Nike Running', contact: 'partnerships@nike.com', template: 'first-contact', status: 'replied', sentAt: '2024-01-10', notes: 'Interesados, esperando propuesta' },
    { id: '2', brand: 'Protein World', contact: 'influencers@pw.com', template: 'first-contact', status: 'pending', sentAt: '2024-01-12', notes: '' },
    { id: '3', brand: 'Gymshark ES', contact: 'colabs@gymshark.com', template: 'follow-up', status: 'opened', sentAt: '2024-01-08', notes: 'Abrió el email 2 veces' },
  ])
  const [showAddTracker, setShowAddTracker] = useState(false)
  const [newEntry, setNewEntry] = useState({ brand: '', contact: '', template: 'first-contact', notes: '' })

  const categories = ['Todos', ...Array.from(new Set(TEMPLATES.map(t => t.category)))]
  const filteredTemplates = filterCat === 'Todos' ? TEMPLATES : TEMPLATES.filter(t => t.category === filterCat)

  function addEntry() {
    if (!newEntry.brand.trim()) return
    setTracker(prev => [{
      id: Date.now().toString(),
      ...newEntry,
      status: 'pending',
      sentAt: new Date().toISOString().split('T')[0],
    }, ...prev])
    setNewEntry({ brand: '', contact: '', template: 'first-contact', notes: '' })
    setShowAddTracker(false)
  }

  function updateStatus(id: string, status: string) {
    setTracker(prev => prev.map(e => e.id === id ? { ...e, status } : e))
  }

  function deleteEntry(id: string) {
    setTracker(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        {(['templates', 'tracker'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-violet-600 text-white' : 'bg-[#13131f] border border-[#1a1a2e] text-gray-400 hover:text-gray-200'
            )}
          >
            {tab === 'templates' ? '📧 Plantillas' : '📊 Tracker de Outreach'}
          </button>
        ))}
      </div>

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template list */}
          <div className="space-y-3">
            {/* Category filter */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    filterCat === cat ? 'bg-violet-600 text-white' : 'bg-[#13131f] border border-[#1a1a2e] text-gray-500 hover:text-gray-300'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredTemplates.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-all',
                  selectedTemplate.id === tmpl.id ? 'bg-violet-600/10 border-violet-500/30' : 'bg-[#13131f] border-[#1a1a2e] hover:border-violet-500/20'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">{tmpl.label}</span>
                  <div className="flex items-center gap-0.5 text-[10px] text-amber-400">
                    <Star size={9} fill="currentColor" /> {tmpl.rating}
                  </div>
                </div>
                <div className="text-[10px] text-violet-400 mb-1.5">{tmpl.category}</div>
                <div className="flex flex-wrap gap-1">
                  {tmpl.tags.map(tag => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a1a2e] text-gray-500">{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Template detail */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white text-sm">{selectedTemplate.label}</h3>
                  <span className="text-xs text-violet-400">{selectedTemplate.category}</span>
                </div>
                <CopyButton text={`Asunto: ${selectedTemplate.subject}\n\n${selectedTemplate.body}`} />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Asunto</label>
                  <div className="mt-1 px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-300 font-medium">
                    {selectedTemplate.subject}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Cuerpo del email</label>
                  <div className="mt-1 px-4 py-3 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                    {selectedTemplate.body}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-300 font-medium mb-1">Variables a reemplazar:</p>
                <p className="text-xs text-gray-400">
                  {Array.from(selectedTemplate.body.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1]).join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tracker' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              {STATUS_OPTIONS.map(s => (
                <div key={s.value} className="flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full', s.value === 'pending' ? 'bg-amber-400' : s.value === 'opened' ? 'bg-blue-400' : s.value === 'replied' ? 'bg-emerald-400' : 'bg-red-400')} />
                  <span className="text-gray-500 text-xs">{s.label}: {tracker.filter(e => e.status === s.value).length}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAddTracker(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Plus size={12} /> Agregar
            </button>
          </div>

          <div className="space-y-2">
            {tracker.map(entry => {
              const statusOpt = STATUS_OPTIONS.find(s => s.value === entry.status) || STATUS_OPTIONS[0]
              const StatusIcon = statusOpt.icon
              return (
                <div key={entry.id} className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-white text-sm">{entry.brand}</span>
                      <span className="text-[10px] text-gray-500">{entry.sentAt}</span>
                    </div>
                    <div className="text-xs text-gray-500">{entry.contact}</div>
                    {entry.notes && <div className="text-xs text-gray-400 mt-1 italic">{entry.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={entry.status}
                      onChange={e => updateStatus(entry.id, e.target.value)}
                      className={cn('text-xs px-2 py-1 rounded-lg border-0 font-medium focus:outline-none cursor-pointer', statusOpt.color)}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <button onClick={() => deleteEntry(entry.id)} className="p-1.5 rounded text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {showAddTracker && (
            <div className="bg-[#13131f] border border-violet-500/20 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-white text-sm">Nuevo Outreach</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Marca *</label>
                  <input value={newEntry.brand} onChange={e => setNewEntry(p => ({ ...p, brand: e.target.value }))} placeholder="Nike, Gymshark..." className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Contacto</label>
                  <input value={newEntry.contact} onChange={e => setNewEntry(p => ({ ...p, contact: e.target.value }))} placeholder="email@marca.com" className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notas</label>
                <input value={newEntry.notes} onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones..." className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddTracker(false)} className="flex-1 py-2 rounded-lg border border-[#1a1a2e] text-xs text-gray-400">Cancelar</button>
                <button onClick={addEntry} className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-xs font-medium">Agregar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
