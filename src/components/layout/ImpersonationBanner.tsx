'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, LogOut } from 'lucide-react'

export default function ImpersonationBanner() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const impersonatorId = (session?.user as any)?.impersonatorId
  if (!impersonatorId) return null

  async function stop() {
    setBusy(true)
    try {
      await update({ stopImpersonation: true })
      router.push('/admin/users')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-black px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium">
      <Eye size={14} />
      <span>Estás viendo como <strong>{session?.user?.name}</strong></span>
      <button
        onClick={stop}
        disabled={busy}
        className="ml-2 flex items-center gap-1.5 bg-black/10 hover:bg-black/20 disabled:opacity-50 rounded-lg px-3 py-1 transition-colors"
      >
        <LogOut size={12} />
        Volver a mi cuenta
      </button>
    </div>
  )
}