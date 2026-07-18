'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import Logo from '@/components/Logo'

export default function ForgotPasswordPage() {
  const [email,     setEmail]   = useState('')
  const [loading,   setLoading] = useState(false)
  const [sent,      setSent]    = useState(false)
  const [error,     setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      // Always show success — don't leak whether email exists
      setSent(true)
    } catch {
      setError('Error al enviar el email. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-[#13131f] border border-[#1a1a2e] rounded-2xl p-6">

          {sent ? (
            /* ── Success state ── */
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} className="text-emerald-400" />
              </div>
              <h1 className="text-base font-bold text-white mb-2">Revisa tu email</h1>
              <p className="text-xs text-gray-400 leading-relaxed mb-6">
                Si hay una cuenta con <strong className="text-gray-200">{email}</strong>, recibirás un
                enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <p className="text-[11px] text-gray-600 mb-5">
                ¿No llegó? Revisa la carpeta de spam o{' '}
                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  className="text-violet-400 hover:underline"
                >
                  inténtalo de nuevo
                </button>
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
              >
                <ArrowLeft size={13} /> Volver al login
              </Link>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <h1 className="text-lg font-bold text-white mb-1">¿Olvidaste tu contraseña?</h1>
              <p className="text-xs text-gray-500 mb-6">
                Escribe tu email y te enviaremos un enlace para restablecerla.
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                  <AlertCircle size={13} /> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-600 mt-5">
                <Link href="/login" className="text-violet-400 hover:underline inline-flex items-center gap-1">
                  <ArrowLeft size={11} /> Volver al login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
