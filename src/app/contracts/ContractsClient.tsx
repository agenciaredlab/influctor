'use client'

import { useState } from 'react'
import { FileText, Copy, CheckCheck, Download, Shield, AlertCircle, Save, Trash2, Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import UpgradeGate from '@/components/ui/UpgradeGate'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const CONTRACT_TYPES = [
  { id: 'sponsored',  label: 'Post Patrocinado',  icon: '📢', desc: 'Para colaboraciones de contenido único' },
  { id: 'ambassador', label: 'Embajador de Marca', icon: '🤝', desc: 'Para relaciones de largo plazo' },
  { id: 'ugc',        label: 'UGC Creator',        icon: '📸', desc: 'Contenido para uso de la marca' },
  { id: 'affiliate',  label: 'Afiliado',            icon: '🔗', desc: 'Comisión por ventas o leads' },
]

const TYPE_LABELS: Record<string, string> = {
  sponsored: 'Post Patrocinado', ambassador: 'Embajador', ugc: 'UGC', affiliate: 'Afiliado',
}

function buildContract(type: string, fields: Record<string, string>): string {
  const date = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  const deliverables: Record<string, string> = {
    sponsored: `• ${fields.posts || '1'} publicación en feed de ${fields.platform || 'Instagram'}
• ${fields.stories || '3'} Stories con link a producto
• Contenido en línea mínimo ${fields.days || '30'} días`,
    ambassador: `• ${fields.posts || '4'} publicaciones mensuales en ${fields.platform || 'Instagram'}
• ${fields.stories || '8'} Stories mensuales
• Participación exclusiva: no mencionar competencia directa
• Duración del acuerdo: ${fields.duration || '3'} meses`,
    ugc: `• ${fields.posts || '5'} piezas de contenido original (fotos/videos)
• Derechos de uso para ${fields.platform || 'redes sociales y digital'}
• Resolución: mínima HD (1080p para video)
• Revisiones incluidas: ${fields.revisions || '2'}`,
    affiliate: `• Promoción activa del producto/servicio
• Link de afiliado personalizado
• Comisión: ${fields.commission || '10'}% por venta/lead confirmado
• Reporte mensual de conversiones`,
  }

  const payment: Record<string, string> = {
    sponsored: `Monto total: ${fields.currency || 'USD'} $${fields.amount || '___'}
Forma de pago: ${fields.payment || 'transferencia bancaria'}
50% al inicio / 50% tras publicación y aprobación`,
    ambassador: `Pago mensual: ${fields.currency || 'USD'} $${fields.amount || '___'}
Fecha de pago: los ${fields.payDay || '5'} de cada mes
Forma de pago: ${fields.payment || 'transferencia bancaria'}`,
    ugc: `Monto total: ${fields.currency || 'USD'} $${fields.amount || '___'}
Forma de pago: ${fields.payment || 'transferencia bancaria'}
Pago al entregar y aprobar los materiales finales`,
    affiliate: `Comisión: ${fields.commission || '10'}% por conversión validada
Mínimo de pago: ${fields.minPayout || 'USD $50'}
Pago: los primeros 10 días de cada mes`,
  }

  return `CONTRATO DE COLABORACIÓN — ${type.toUpperCase()}
Fecha: ${date}

═══════════════════════════════════════════

PARTES:

CREADOR: ${fields.creatorName || '[Tu nombre completo]'}
DNI/RFC: ${fields.creatorId || '[Número de identificación]'}
Email: ${fields.creatorEmail || '[tu@email.com]'}
Perfil: ${fields.creatorProfile || '[URL de tu perfil]'}

MARCA / EMPRESA: ${fields.brandName || '[Nombre de la empresa]'}
Representante: ${fields.brandContact || '[Nombre del contacto]'}
Email: ${fields.brandEmail || '[contacto@empresa.com]'}
Sitio web: ${fields.brandWeb || '[www.empresa.com]'}

═══════════════════════════════════════════

1. OBJETO DEL CONTRATO

${fields.creatorName || 'El Creador'} se compromete a crear y publicar contenido patrocinado
para ${fields.brandName || 'la Marca'} en las siguientes plataformas:
${fields.platform || 'Instagram / TikTok'}

Tema/Producto a promocionar: ${fields.product || '[Descripción del producto o servicio]'}

═══════════════════════════════════════════

2. ENTREGABLES

${deliverables[type] || deliverables['sponsored']}

═══════════════════════════════════════════

3. COMPENSACIÓN

${payment[type] || payment['sponsored']}

═══════════════════════════════════════════

4. DERECHOS Y LICENCIAS

4.1 El Creador mantiene los derechos de autor sobre el contenido.
4.2 La Marca obtiene licencia de uso ${type === 'ugc' ? 'perpetua y exclusiva' : 'no exclusiva por 30 días'} del contenido
    para uso en redes sociales y plataformas digitales propias.
4.3 Queda prohibida la reedición o modificación del contenido sin consentimiento previo.

═══════════════════════════════════════════

5. DIVULGACIÓN Y TRANSPARENCIA

El contenido deberá incluir marcadores de publicidad (#ad, #publicidad o
equivalente) según la legislación vigente del país del Creador.
El incumplimiento de esta cláusula libera a la Marca de cualquier
responsabilidad legal derivada.

═══════════════════════════════════════════

6. CONFIDENCIALIDAD

Ambas partes se comprometen a no divulgar términos económicos ni
información estratégica compartida durante la colaboración.

═══════════════════════════════════════════

7. RESOLUCIÓN Y PENALIZACIONES

7.1 Cancelación por la Marca antes del inicio: pago del 50% acordado.
7.2 Cancelación por el Creador sin causa justificada: devolución del adelanto.
7.3 Entrega fuera de plazo sin aviso previo: penalización del 10% por semana.

═══════════════════════════════════════════

8. JURISDICCIÓN

Este contrato se rige bajo las leyes de ${fields.country || '[País del Creador]'}.
Cualquier disputa se resolverá por mediación antes de recurrir a vías legales.

═══════════════════════════════════════════

FIRMAS

Creador: _________________________  Fecha: ________________
${fields.creatorName || '[Tu nombre]'}

Marca: ___________________________  Fecha: ________________
${fields.brandContact || '[Representante de la marca]'}

═══════════════════════════════════════════
Documento generado con Influctor · ${date}
`
}

function buildContractHtml(contract: string, title: string): string {
  const escaped = contract
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/═+/g, '<hr style="border:1px solid #ccc;margin:12px 0">')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', serif; font-size: 13px; line-height: 1.7; color: #1a1a1a; padding: 48px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.7; }
  hr { border: none; border-top: 1px solid #bbb; margin: 14px 0; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #888; text-align: center; }
  @media print {
    body { padding: 32px; }
    @page { margin: 2cm; }
  }
</style>
</head>
<body>
<pre>${escaped}</pre>
<div class="footer">Documento generado con Influctor &mdash; ${title}</div>
</body>
</html>`
}

function downloadHtml(contract: string, title: string) {
  const html = buildContractHtml(contract, title)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'contrato'}.html`
  a.click()
  URL.revokeObjectURL(url)
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a2e] hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-xs transition-colors">
      {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

interface SavedContract {
  id: string
  title: string
  type: string
  createdAt: string
}

interface ContractsClientProps {
  plan: string
  initialContracts: SavedContract[]
}

export default function ContractsClient({ plan, initialContracts }: ContractsClientProps) {
  const [contractType, setContractType] = useState('sponsored')
  const [fields, setFields]             = useState<Record<string, string>>({})
  const [saveTitle, setSaveTitle]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [savedContracts, setSavedContracts] = useState<SavedContract[]>(initialContracts)
  const [saveError, setSaveError]       = useState('')
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  const contract = buildContract(contractType, fields)

  function setField(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    const title = saveTitle.trim() || `Contrato ${TYPE_LABELS[contractType]} — ${new Date().toLocaleDateString('es-ES')}`
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type: contractType, fields, content: contract }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error || 'Error al guardar')
        return
      }
      const saved = await res.json()
      setSavedContracts(prev => [{ id: saved.id, title: saved.title, type: saved.type, createdAt: saved.createdAt }, ...prev])
      setSaveTitle('')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      setSavedContracts(prev => prev.filter(c => c.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleLoad(id: string) {
    const res = await fetch(`/api/contracts/${id}`)
    if (!res.ok) return
    const saved = await res.json()
    const parsedFields = typeof saved.fields === 'string' ? JSON.parse(saved.fields) : saved.fields
    setContractType(saved.type)
    setFields(parsedFields)
    setSaveTitle(saved.title)
  }

  const FIELD_GROUPS = [
    {
      title: 'Tus datos',
      fields: [
        { key: 'creatorName',    label: 'Tu nombre completo',    placeholder: 'Juan García López' },
        { key: 'creatorEmail',   label: 'Tu email',              placeholder: 'tu@email.com' },
        { key: 'creatorProfile', label: 'URL de tu perfil',      placeholder: 'https://instagram.com/tu_usuario' },
        { key: 'creatorId',      label: 'DNI / RFC (opcional)',  placeholder: 'Número de identificación' },
      ]
    },
    {
      title: 'Datos de la marca',
      fields: [
        { key: 'brandName',    label: 'Nombre de la empresa', placeholder: 'Nike Spain S.L.' },
        { key: 'brandContact', label: 'Nombre del contacto',  placeholder: 'María Rodríguez' },
        { key: 'brandEmail',   label: 'Email de la marca',    placeholder: 'partnerships@marca.com' },
        { key: 'brandWeb',     label: 'Sitio web',            placeholder: 'www.marca.com' },
      ]
    },
    {
      title: 'Detalles del contrato',
      fields: [
        { key: 'product',  label: 'Producto / Servicio a promocionar', placeholder: 'Zapatillas running modelo X' },
        { key: 'platform', label: 'Plataforma(s)',                     placeholder: 'Instagram, TikTok' },
        { key: 'amount',   label: 'Monto ($)',                         placeholder: '500' },
        { key: 'currency', label: 'Moneda',                            placeholder: 'USD' },
        { key: 'country',  label: 'País / Jurisdicción',               placeholder: 'España' },
      ]
    },
  ]

  const autoTitle = `Contrato ${TYPE_LABELS[contractType]}${fields.brandName ? ` — ${fields.brandName}` : ''}`

  return (
    <UpgradeGate
      plan={plan}
      requiredPlan="creator"
      feature="Contract Builder"
      description="Genera contratos profesionales personalizados para posts patrocinados, embajadores, UGC y programas de afiliados."
    >
    <div className="space-y-6">
      {/* Contract type selector */}
      <div>
        <h3 className="font-semibold text-white text-sm mb-3">Tipo de contrato</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CONTRACT_TYPES.map(ct => (
            <button
              key={ct.id}
              onClick={() => setContractType(ct.id)}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                contractType === ct.id
                  ? 'bg-violet-600/15 border-violet-500/30'
                  : 'bg-[#13131f] border-[#1a1a2e] hover:border-violet-500/20'
              )}
            >
              <div className="text-2xl mb-1.5">{ct.icon}</div>
              <div className="text-xs font-semibold text-white">{ct.label}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{ct.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-5">
          {FIELD_GROUPS.map(group => (
            <div key={group.title} className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{group.title}</h4>
              {group.fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                  <input
                    value={fields[f.key] || ''}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Save panel */}
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Guardar contrato</h4>
            <input
              value={saveTitle}
              onChange={e => setSaveTitle(e.target.value)}
              placeholder={autoTitle}
              className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            />
            {saveError && <p className="text-xs text-red-400">{saveError}</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Save size={12} />
              {saving ? 'Guardando...' : 'Guardar en mis contratos'}
            </button>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">Este generador crea un borrador como punto de partida. Para contratos de alto valor, consulta con un abogado especializado.</p>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Shield size={13} className="text-violet-400" />
              Vista previa
            </h3>
            <div className="flex items-center gap-2">
              <CopyButton text={contract} />
              <button
                onClick={() => downloadHtml(contract, saveTitle.trim() || autoTitle)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a2e] hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-xs transition-colors"
              >
                <Download size={12} />
                Descargar
              </button>
            </div>
          </div>
          <div className="bg-[#0d0d1a] rounded-xl p-4 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
            {contract}
          </div>
        </div>
      </div>

      {/* Saved contracts */}
      {savedContracts.length > 0 && (
        <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock size={13} className="text-violet-400" />
            Contratos guardados ({savedContracts.length})
          </h3>
          <div className="space-y-2">
            {savedContracts.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#0d0d1a] border border-[#1a1a2e] group hover:border-violet-500/20 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg flex-shrink-0">
                    {CONTRACT_TYPES.find(t => t.id === c.type)?.icon ?? '📄'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 truncate">{c.title}</p>
                    <p className="text-[10px] text-gray-500">
                      {TYPE_LABELS[c.type] ?? c.type} · {format(new Date(c.createdAt), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                  <button
                    onClick={() => handleLoad(c.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 hover:text-violet-400 rounded transition-colors"
                  >
                    <ChevronRight size={11} />
                    Cargar
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="p-1.5 text-gray-600 hover:text-red-400 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </UpgradeGate>
  )
}
