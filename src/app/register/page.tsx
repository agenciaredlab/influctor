'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    setError('')

    // 1. Create account
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al crear la cuenta')
      setLoading(false)
      return
    }

    // 2. Auto sign-in
    const signInRes = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    })

    if (signInRes?.error) {
      setError('Cuenta creada, pero no se pudo iniciar sesión automáticamente. Inicia sesión manualmente.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const strengthLabels = ['', 'Débil', 'Aceptable', 'Fuerte']
  const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500']

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

        {/* Card */}
        <div className="bg-[#13131f] border border-[#1a1a2e] rounded-2xl p-6">
          <h1 className="text-lg font-bold text-white mb-1">Crea tu cuenta gratis</h1>
          <p className="text-xs text-gray-500 mb-6">Sin tarjeta de crédito · Plan Free incluido</p>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
              />
            </div>
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
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
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
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-[#1a1a2e]'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">{strengthLabels[strength]}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>
          </form>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {['Sin tarjeta', '7 días gratis', 'Cancela cuando quieras'].map(t => (
              <div key={t} className="flex items-center gap-1 text-[10px] text-gray-600">
                <CheckCircle size={9} className="text-emerald-500" /> {t}
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-600 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-violet-400 hover:underline font-medium">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
