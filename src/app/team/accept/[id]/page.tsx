'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Logo from '@/components/Logo'

export default function AcceptInvitePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [invite, setInvite]     = useState<{ invitedEmail: string; ownerName: string } | null>(null)
  const [loadError, setLoadError] = useState('')
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetch(`/api/team/accept/${params.id}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) { setLoadError(data.error ?? 'Invitación no válida'); return }
        setInvite(data)
      })
      .catch(() => setLoadError('No se pudo cargar la invitación'))
  }, [params.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch(`/api/team/accept/${params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'No se pudo aceptar la invitación')
      setSubmitting(false)
      return
    }

    const signInRes = await signIn('credentials', { email: data.email, password, redirect: false })
    if (signInRes?.error) {
      router.push('/login')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6"><Logo /></div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-2xl p-6">
          {loadError ? (
            <p className="text-sm text-red-400 text-center">{loadError}</p>
          ) : !invite ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-gray-500" /></div>
          ) : (
            <>
              <h1 className="text-lg font-bold text-white mb-1">Te invitaron a un equipo</h1>
              <p className="text-sm text-gray-400 mb-5">
                <strong className="text-violet-300">{invite.ownerName}</strong> te invitó a colaborar en Influctor.
                Creá tu contraseña para <strong className="text-white">{invite.invitedEmail}</strong>.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-[#09090f] border border-[#1e1e35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                />
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} required value={password} minLength={8}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Contraseña (mínimo 8 caracteres)"
                    className="w-full bg-[#09090f] border border-[#1e1e35] rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  type="submit" disabled={submitting}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-white text-sm font-semibold transition-colors"
                >
                  {submitting ? 'Uniéndote…' : 'Aceptar y entrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
