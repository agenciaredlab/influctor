'use client'

import { useState, useRef } from 'react'
import { Save, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, Upload, X, ImageIcon } from 'lucide-react'
import { CONFIG_FIELDS } from '@/lib/config'
import Logo from '@/components/Logo'

type SettingsMap = Record<string, string>

interface Props {
  initial: SettingsMap
}

const LINKS: Record<string, { label: string; url: string }> = {
  Stripe:          { label: 'Dashboard de Stripe',     url: 'https://dashboard.stripe.com/apikeys' },
  'Anthropic (IA)':{ label: 'Anthropic Console',       url: 'https://console.anthropic.com/settings/keys' },
  'Resend (Email)':{ label: 'Resend Dashboard',         url: 'https://resend.com/api-keys' },
  'Instagram / Meta': { label: 'Meta for Developers',  url: 'https://developers.facebook.com/apps' },
  TikTok:          { label: 'TikTok for Developers',   url: 'https://developers.tiktok.com' },
}

// Rendered with a dedicated upload widget instead of the generic text-field loop.
const CUSTOM_GROUPS = new Set(['Marca'])

export default function SettingsClient({ initial }: Props) {
  const [values, setValues]   = useState<SettingsMap>(initial)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [saving, setSaving]   = useState<string | null>(null)
  const [saved,  setSaved]    = useState<string | null>(null)
  const [error,  setError]    = useState<string | null>(null)

  const [logoUrl, setLogoUrl]         = useState(initial.branding_logo_url ?? '')
  const [uploading, setUploading]     = useState(false)
  const [logoError, setLogoError]     = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function toggle(key: string) {
    setVisible(v => ({ ...v, [key]: !v[key] }))
  }

  async function saveGroup(group: string, keys: string[]) {
    setSaving(group)
    setError(null)
    try {
      const payload: SettingsMap = {}
      for (const k of keys) payload[k] = values[k] ?? ''

      const res = await fetch('/api/admin/settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error')
      setSaved(group)
      setTimeout(() => setSaved(null), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(null)
    }
  }

  async function saveBrandingLogoUrl(url: string) {
    await fetch('/api/admin/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ branding_logo_url: url }),
    })
  }

  async function handleLogoFile(file: File) {
    setLogoError(null)
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!ALLOWED.includes(file.type)) {
      setLogoError('Formato no permitido. Usa JPG, PNG, WEBP o SVG.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setLogoError('El archivo supera los 10 MB.')
      return
    }

    setUploading(true)
    try {
      const presign = await fetch('/api/upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ folder: 'brands', filename: file.name, mime: file.type, size: file.size }),
      })
      if (!presign.ok) throw new Error((await presign.json()).error ?? 'Error al preparar la subida')
      const { uploadUrl, publicUrl } = await presign.json()

      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!put.ok) throw new Error('Error al subir el archivo al storage')

      await saveBrandingLogoUrl(publicUrl)
      setLogoUrl(publicUrl)
      setValues(v => ({ ...v, branding_logo_url: publicUrl }))
    } catch (e: any) {
      setLogoError(e.message ?? 'Error al subir el logo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function removeLogo() {
    setUploading(true)
    setLogoError(null)
    try {
      await saveBrandingLogoUrl('')
      setLogoUrl('')
      setValues(v => ({ ...v, branding_logo_url: '' }))
    } catch {
      setLogoError('Error al quitar el logo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración de Servicios</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Las keys se guardan cifradas en la base de datos. Dejar un campo en blanco elimina la key guardada y usa la variable de entorno como fallback.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Marca (logo upload) ── */}
      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">Marca</h2>
          <p className="text-xs text-gray-500 mt-1">Sube el logo de tu marca. Se usa en el sidebar, login, registro y la landing.</p>
        </div>

        {logoError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {logoError}
          </div>
        )}

        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-xl bg-[#1a1a2e] border border-[#2a2a45] flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo actual" className="max-w-full max-h-full object-contain" />
            ) : (
              <Logo size="sm" showTagline={false} />
            )}
          </div>

          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {uploading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Subiendo...</>
                ) : (
                  <><Upload className="w-4 h-4" /> {logoUrl ? 'Cambiar logo' : 'Subir logo'}</>
                )}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={removeLogo}
                  disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] hover:bg-[#232340] disabled:opacity-50 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" /> Quitar
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-600 mt-2 flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3" /> JPG, PNG, WEBP o SVG · máximo 10 MB
            </p>
          </div>
        </div>
      </div>

      {CONFIG_FIELDS.filter(g => !CUSTOM_GROUPS.has(g.group)).map(group => {
        const keys = group.fields.map(f => f.key)
        const link = LINKS[group.group]
        const isSaving = saving === group.group
        const wasSaved = saved  === group.group

        return (
          <div key={group.group} className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white">{group.group}</h2>
                {link && (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {link.label} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <button
                onClick={() => saveGroup(group.group, keys)}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {wasSaved ? (
                  <><CheckCircle className="w-4 h-4" /> Guardado</>
                ) : isSaving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="w-4 h-4" /> Guardar</>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {group.fields.map(field => {
                const val     = values[field.key] ?? ''
                const isPass  = field.type === 'password'
                const show    = visible[field.key]
                const masked  = val === '••••••••'

                return (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        type={isPass && !show ? 'password' : 'text'}
                        value={val}
                        placeholder={masked ? '(guardado — deja en blanco para mantener)' : field.placeholder}
                        onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                        onFocus={() => {
                          if (masked) setValues(v => ({ ...v, [field.key]: '' }))
                        }}
                        className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors pr-10"
                      />
                      {isPass && (
                        <button
                          type="button"
                          onClick={() => toggle(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
