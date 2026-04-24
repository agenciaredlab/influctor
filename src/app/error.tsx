'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="es">
      <body className="bg-[#07070f] text-white antialiased">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Algo salió mal</h1>
              <p className="text-gray-400 text-sm">
                Ocurrió un error inesperado. Podés intentar recargar la página o volver al inicio.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a45] hover:border-purple-500/50 text-gray-300 text-sm rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                Ir al inicio
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
