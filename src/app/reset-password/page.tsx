'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')

  // Client-side validations
  function validate(): string {
    if (!token)           return 'Enlace inválido. Solicita uno nuevo.'
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (password !== confirm) return 'Las contraseñas no coinciden.'
    return ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)
    setError('')

    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al restablecer la contraseña.')
      } else {
        setDone(true)
        setTimeout(() => router.push('/login'), 3000)
      }
    } catch {
      setError('Error de red. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-white tracking-tight">influctor</div>
            <div className="text-[10px] text-violet-400 -mt-0.5">Social Growth Platform</div>
          </div>
        </div>

        <div className="bg-[#13131f] border border-[#1a1a2e] rounded-2xl p-6">

          {!token ? (
            /* ── No token ── */
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <h1 className="text-base font-bold text-white mb-2">Enlace inválido</h1>
              <p className="text-xs text-gray-400 mb-5">Este enlace de recuperación no es válido.</p>
              <Link href="/forgot-password" className="text-sm text-violet-400 hover:underline">
                Solicitar nuevo enlace
              </Link>
            </div>
          ) : done ? (
            /* ── Success ── */
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} className="text-emerald-400" />
              </div>
              <h1 className="text-base font-bold text-white mb-2">¡Contraseña actualizada!</h1>
              <p className="text-xs text-gray-400 mb-2">
                Tu contraseña fue restablecida exitosamente.
              </p>
              <p className="text-[11px] text-gray-600">Redirigiendo al login...</p>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <h1 className="text-lg font-bold text-white mb-1">Nueva contraseña</h1>
              <p className="text-xs text-gray-500 mb-6">Elige una contraseña segura de al menos 8 caracteres.</p>

              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                  <AlertCircle size={13} /> {error}
                  {error.includes('expiró') && (
                    <Link href="/forgot-password" className="ml-auto text-violet-400 hover:underline whitespace-nowrap">
                      Pedir nuevo enlace
                    </Link>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                      className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Confirmar contraseña</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {/* Strength indicator */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => {
                        const strength = Math.min(4, Math.floor(password.length / 3))
                        return (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i <= strength
                                ? strength <= 1 ? 'bg-red-500'
                                : strength <= 2 ? 'bg-amber-500'
                                : strength <= 3 ? 'bg-blue-500'
                                : 'bg-emerald-500'
                                : 'bg-[#1e1e35]'
                            }`}
                          />
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-gray-600">
                      {password.length < 8 ? 'Muy corta' : password.length < 12 ? 'Aceptable' : password.length < 16 ? 'Buena' : 'Muy segura'}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Establecer nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
