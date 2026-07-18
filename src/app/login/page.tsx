'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle, Chrome } from 'lucide-react'
import { cn } from '@/lib/utils'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get('callbackUrl') ?? '/dashboard'
  const urlError     = searchParams.get('error')

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(urlError === 'CredentialsSignin' ? 'Email o contraseña incorrectos' : '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email:    email.trim().toLowerCase(),
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  async function handleGoogle() {
    setLoading(true)
    await signIn('google', { callbackUrl })
  }

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="bg-[#13131f] border border-[#1a1a2e] rounded-2xl p-6">
          <h1 className="text-lg font-bold text-white mb-1">Bienvenido de vuelta</h1>
          <p className="text-xs text-gray-500 mb-6">Inicia sesión en tu cuenta</p>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Google */}
          {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === '1' && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-[#1a1a2e] bg-[#0d0d1a] hover:bg-[#1a1a2e] text-gray-200 text-sm font-medium transition-colors disabled:opacity-50 mb-4"
              >
                <Chrome size={15} /> Continuar con Google
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[#1a1a2e]" />
                <span className="text-[11px] text-gray-600">o con email</span>
                <div className="flex-1 h-px bg-[#1a1a2e]" />
              </div>
            </>
          )}

          {/* Form */}
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">Contraseña</label>
                <Link href="/forgot-password" className="text-[11px] text-violet-400 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-5">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-violet-400 hover:underline font-medium">
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
