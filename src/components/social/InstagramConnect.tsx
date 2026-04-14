'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, LogOut, CheckCircle, AlertCircle, ExternalLink, Users, BarChart2, Image, Zap, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InstagramAccount {
  id: string
  username: string
  displayName: string | null
  profilePicture: string | null
  biography: string | null
  website: string | null
  followersCount: number
  followingCount: number
  mediaCount: number
  accountType: string | null
  lastSyncAt: string | null
  tokenExpiresAt: string | null
}

interface Snapshot {
  date: string
  followers: number
  reach: number
  impressions: number
  profileViews: number
  newFollowers: number
}

interface Props {
  onConnected?: (account: InstagramAccount) => void
}

function formatK(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

export default function InstagramConnect({ onConnected }: Props) {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState<InstagramAccount | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search)
    if (params.get('instagram_connected') === '1') {
      setSuccessMsg('¡Instagram conectado correctamente!')
      window.history.replaceState({}, '', window.location.pathname)
      syncData()
    } else if (params.get('instagram_error')) {
      setError(decodeURIComponent(params.get('instagram_error')!))
      window.history.replaceState({}, '', window.location.pathname)
    }
    fetchStatus()
  }, [])

  async function fetchStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/social/instagram/sync')
      const data = await res.json()
      if (data.connected) {
        setConnected(true)
        setAccount(data.account)
        setSnapshots(data.snapshots || [])
        onConnected?.(data.account)
      } else {
        setConnected(false)
        setAccount(null)
      }
    } catch {
      setError('Error al verificar la conexión')
    } finally {
      setLoading(false)
    }
  }

  async function syncData() {
    setSyncing(true)
    setError('')
    try {
      const res = await fetch('/api/social/instagram/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchStatus()
      setSuccessMsg(`Sincronizado: ${formatK(data.synced.followers)} seguidores, ${data.synced.mediaSynced} posts`)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  async function disconnect() {
    if (!confirm('¿Desconectar tu cuenta de Instagram?')) return
    setDisconnecting(true)
    try {
      await fetch('/api/social/instagram/disconnect', { method: 'POST' })
      setConnected(false)
      setAccount(null)
      setSnapshots([])
    } catch {
      setError('Error al desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-[#13131f] border border-[#1a1a2e] rounded-xl">
        <RefreshCw size={16} className="text-gray-500 animate-spin" />
        <span className="text-sm text-gray-500">Verificando conexión...</span>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          {/* Instagram gradient icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
            📸
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Instagram</h3>
            <p className="text-xs text-gray-500">No conectado</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-400">
          <p className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-400" /> Métricas reales de tu cuenta</p>
          <p className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-400" /> Rendimiento de tus posts</p>
          <p className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-400" /> Alcance e impresiones diarias</p>
          <p className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-400" /> Crecimiento de seguidores en tiempo real</p>
        </div>

        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-300 font-medium mb-1">Requisito</p>
          <p className="text-xs text-gray-400">Tu cuenta debe ser tipo <strong className="text-amber-300">Empresa</strong> o <strong className="text-amber-300">Creador</strong> y estar vinculada a una Página de Facebook.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <a
          href="/api/auth/instagram/connect"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)' }}
        >
          Conectar Instagram
        </a>

        <p className="text-[10px] text-gray-600 text-center">
          Necesitas configurar <code className="text-gray-500">INSTAGRAM_APP_ID</code> y <code className="text-gray-500">INSTAGRAM_APP_SECRET</code> en .env.local
        </p>
      </div>
    )
  }

  // Connected view
  const latestSnapshot = snapshots[0]
  const prevSnapshot = snapshots[7] // ~7 days ago
  const followerGrowth = prevSnapshot ? account!.followersCount - prevSnapshot.followers : 0
  const tokenDaysLeft = account?.tokenExpiresAt
    ? Math.ceil((new Date(account.tokenExpiresAt).getTime() - Date.now()) / (1000 * 3600 * 24))
    : null

  return (
    <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {account?.profilePicture ? (
            <img src={account.profilePicture} alt={account.username} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)' }}>
              📸
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white text-sm">@{account?.username}</span>
              <CheckCircle size={12} className="text-emerald-400" />
              {account?.accountType && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/20">
                  {account.accountType}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{account?.displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={syncData}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a2e] hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-xs transition-colors"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync...' : 'Sync'}
          </button>
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Desconectar"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle size={12} className="text-emerald-400" />
          <p className="text-xs text-emerald-400">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Seguidores', value: formatK(account?.followersCount ?? 0), icon: Users, color: 'text-violet-400' },
          { label: 'Posts', value: formatK(account?.mediaCount ?? 0), icon: Image, color: 'text-pink-400' },
          { label: 'Siguiendo', value: formatK(account?.followingCount ?? 0), icon: TrendingUp, color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0d0d1a] rounded-lg p-2.5 text-center">
            <stat.icon size={13} className={cn('mx-auto mb-1', stat.color)} />
            <div className="text-sm font-bold text-white">{stat.value}</div>
            <div className="text-[10px] text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Growth this week */}
      {followerGrowth !== 0 && (
        <div className={cn(
          'flex items-center gap-2 p-2.5 rounded-lg text-xs',
          followerGrowth > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        )}>
          <TrendingUp size={12} />
          <span>{followerGrowth > 0 ? '+' : ''}{followerGrowth} seguidores esta semana</span>
        </div>
      )}

      {latestSnapshot && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0d0d1a] rounded-lg p-2.5">
            <div className="text-[10px] text-gray-500 mb-0.5">Alcance hoy</div>
            <div className="text-sm font-bold text-white">{formatK(latestSnapshot.reach || 0)}</div>
          </div>
          <div className="bg-[#0d0d1a] rounded-lg p-2.5">
            <div className="text-[10px] text-gray-500 mb-0.5">Impresiones</div>
            <div className="text-sm font-bold text-white">{formatK(latestSnapshot.impressions || 0)}</div>
          </div>
        </div>
      )}

      {/* Token expiry warning */}
      {tokenDaysLeft !== null && tokenDaysLeft <= 10 && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-400">
            Tu token expira en {tokenDaysLeft} días.{' '}
            <a href="/api/auth/instagram/connect" className="underline">Reconecta para renovarlo.</a>
          </p>
        </div>
      )}

      {account?.lastSyncAt && (
        <p className="text-[10px] text-gray-600 text-center">
          Último sync: {new Date(account.lastSyncAt).toLocaleString('es-ES')}
        </p>
      )}
    </div>
  )
}
