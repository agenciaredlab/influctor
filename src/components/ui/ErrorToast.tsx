'use client'

import { useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'

/**
 * Reads the `{ error }` message the API routes return on a non-ok response
 * (e.g. 403 `{ error: 'No tienes permiso para ...' }` for team members).
 */
export async function readApiError(res: Response, fallback = 'No se pudo completar la acción'): Promise<string> {
  try {
    const json = await res.json()
    return typeof json?.error === 'string' && json.error ? json.error : fallback
  } catch {
    return fallback
  }
}

/** Dismissible error toast (same look as the Marketplace toast). Renders nothing when `message` is empty. */
export default function ErrorToast({ message, onClose }: { message: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, 6000)
    return () => clearTimeout(t)
  }, [message, onClose])

  if (!message) return null
  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium max-w-sm bg-red-500/10 border-red-500/30 text-red-400"
    >
      <AlertCircle size={14} className="flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar" className="flex-shrink-0 hover:text-red-300">
        <X size={14} />
      </button>
    </div>
  )
}
