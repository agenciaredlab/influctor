'use client'

import { useState } from 'react'
import { Save, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { CONFIG_FIELDS } from '@/lib/config'

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

export default function SettingsClient({ initial }: Props) {
  const [values, setValues]   = useState<SettingsMap>(initial)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [saving, setSaving]   = useState<string | null>(null)
  const [saved,  setSaved]    = useState<string | null>(null)
  const [error,  setError]    = useState<string | null>(null)

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

      {CONFIG_FIELDS.map(group => {
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
