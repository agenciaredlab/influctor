'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function PageError({
  error,
  reset,
  title = 'No se pudo cargar esta sección',
}: {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
}) {
  useEffect(() => {
    console.error('[PageError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-5 text-center px-4">
      <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-gray-500 text-sm mt-1">
          {error.message?.includes('fetch') || error.message?.includes('network')
            ? 'Verifica tu conexión e intenta de nuevo.'
            : 'Intenta recargar la página.'}
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] border border-[#2a2a45] hover:border-purple-500/50 text-gray-300 hover:text-white text-sm rounded-lg transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </button>
    </div>
  )
}
