'use client'

import { useEffect, useState } from 'react'
import { Users, Trash2, Send, Loader2 } from 'lucide-react'

const PERMISSIONS: { key: string; label: string }[] = [
  { key: 'canManageContent',         label: 'Calendario de contenido' },
  { key: 'canManageDeals',           label: 'Brand deals' },
  { key: 'canManageCompetitors',     label: 'Competidores' },
  { key: 'canConnectSocialAccounts', label: 'Conectar redes sociales' },
  { key: 'canUseAI',                 label: 'AI Studio' },
  { key: 'canViewIncome',            label: 'Ver ingresos' },
]

const EMPTY_PERMS = Object.fromEntries(PERMISSIONS.map(p => [p.key, false])) as Record<string, boolean>

interface Member {
  id: string
  invitedEmail: string
  status: string
  member: { name: string; email: string } | null
  [key: string]: any
}

export default function TeamSection() {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [email, setEmail] = useState('')
  const [perms, setPerms] = useState<Record<string, boolean>>(EMPTY_PERMS)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch('/api/team')
    if (res.ok) setMembers(await res.json())
  }

  useEffect(() => { load() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInviting(true)
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...perms }),
    })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) { setError(data.error ?? 'No se pudo invitar'); return }
    setEmail('')
    setPerms(EMPTY_PERMS)
    load()
  }

  async function togglePermission(id: string, key: string, value: boolean) {
    setMembers(prev => prev?.map(m => m.id === id ? { ...m, [key]: value } : m) ?? prev)
    await fetch(`/api/team/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
  }

  async function remove(id: string) {
    setMembers(prev => prev?.filter(m => m.id !== id) ?? prev)
    await fetch(`/api/team/${id}`, { method: 'DELETE' })
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Users size={18} className="text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Mi Equipo</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Invita a personas de tu empresa para que trabajen en tu misma cuenta — con su propio
        correo y contraseña. El cupo de IA y los datos se comparten entre todos.
      </p>

      {members === null ? (
        <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 size={14} className="animate-spin" /> Cargando…</div>
      ) : (
        <div className="space-y-3 mb-5">
          {members.length === 0 && <p className="text-xs text-gray-600">Todavía no invitaste a nadie.</p>}
          {members.map(m => (
            <div key={m.id} className="p-3 bg-[#0f0f1a] border border-[#1e1e35] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm text-white font-medium">{m.member?.name ?? m.invitedEmail}</div>
                  <div className="text-[11px] text-gray-500">
                    {m.invitedEmail} · {m.status === 'active' ? 'Activo' : m.status === 'pending' ? 'Invitación pendiente' : 'Removido'}
                  </div>
                </div>
                <button onClick={() => remove(m.id)} className="text-gray-500 hover:text-red-400 transition-colors" title="Quitar">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {PERMISSIONS.map(p => (
                  <label key={p.key} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <input
                      type="checkbox"
                      checked={!!m[p.key]}
                      onChange={e => togglePermission(m.id, p.key, e.target.checked)}
                      className="accent-violet-500"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleInvite} className="border-t border-[#1e1e35] pt-4">
        <label className="block text-xs text-gray-400 mb-1.5">Invitar por correo</label>
        <div className="flex gap-2 mb-3">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="persona@empresa.com"
            className="flex-1 bg-[#0f0f1a] border border-[#1e1e35] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={inviting}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
          >
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Invitar
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {PERMISSIONS.map(p => (
            <label key={p.key} className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <input
                type="checkbox"
                checked={perms[p.key]}
                onChange={e => setPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                className="accent-violet-500"
              />
              {p.label}
            </label>
          ))}
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </form>
    </div>
  )
}
