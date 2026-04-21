'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, LogOut, CheckCircle, AlertCircle, TrendingUp, Video, Heart, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TikTokAccount {
  id:             string
  username:       string
  displayName:    string | null
  profilePicture: string | null
  biography:      string | null
  followersCount: number
  followingCount: number
  mediaCount:     number
  accountType:    string | null
  lastSyncAt:     string | null
  tokenExpiresAt: string | null
}

interface Snapshot {
  date:        string
  followers:   number
  reach:       number
  impressions: number
  newFollowers: number
  engagement:  number
}

function formatK(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

const TIKTOK_GRADIENT = 'linear-gradient(135deg, #010101 0%, #69C9D0 50%, #EE1D52 100%)'

export default function TikTokConnect() {
  const [loading,       setLoading]       = useState(true)
  const [syncing,       setSyncing]       = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connected,     setConnected]     = useState(false)
  const [account,       setAccount]       = useState<TikTokAccount | null>(null)
  const [snapshots,     setSnapshots]     = useState<Snapshot[]>([])
  const [error,         setError]         = useState('')
  const [successMsg,    setSuccessMsg]    = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tiktok_connected') === '1') {
      setSuccessMsg('¡TikTok conectado correctamente!')
      window.history.replaceState({}, '', window.location.pathname)
      syncData()
    } else if (params.get('tiktok_error')) {
      setError(decodeURIComponent(params.get('tiktok_error')!))
      window.history.replaceState({}, '', window.location.pathname)
    }
    fetchStatus()
  }, [])

  async function fetchStatus() {
    setLoading(true)
    try {
      const res  = await fetch('/api/social/tiktok/sync')
      const data = await res.json()
      if (data.connected) {
        setConnected(true)
        setAccount(data.account)
        setSnapshots(data.snapshots ?? [])
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
      const res  = await fetch('/api/social/tiktok/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchStatus()
      setSuccessMsg(`Sincronizado: ${formatK(data.synced.followers)} seguidores, ${data.synced.videosProcessed} videos`)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  async function disconnect() {
    if (!confirm('¿Desconectar tu cuenta de TikTok?')) return
    setDisconnecting(true)
    try {
      await fetch('/api/social/tiktok/disconnect', { method: 'POST' })
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: TIKTOK_GRADIENT }}>
            🎵
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">TikTok</h3>
            <p className="text-xs text-gray-500">No conectado</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-400">
          <p className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-400" /> Seguidores y crecimiento real</p>
          <p className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-400" /> Vistas y engagement de tus videos</p>
          <p className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-400" /> Tasa de engagement calculada</p>
          <p className="flex items-center gap-1.5"><CheckCircle size={11} className="text-emerald-400" /> Snapshots diarios automáticos</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <a
          href="/api/auth/tiktok/connect"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: TIKTOK_GRADIENT }}
        >
          Conectar TikTok
        </a>

        <p className="text-[10px] text-gray-600 text-center">
          Necesitas configurar <code className="text-gray-500">TIKTOK_CLIENT_KEY</code> y <code className="text-gray-500">TIKTOK_CLIENT_SECRET</code> en .env.local
        </p>
      </div>
    )
  }

  // Connected view
  const latest = snapshots[0]
  const weekAgo = snapshots[6]
  const followerGrowth = weekAgo ? account!.followersCount - weekAgo.followers : 0
  const totalViews7d   = snapshots.slice(0, 7).reduce((s, snap) => s + (snap.reach ?? 0), 0)

  return (
    <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {account?.profilePicture ? (
            <img src={account.profilePicture} alt={account.username}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#EE1D52]/30" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: TIKTOK_GRADIENT }}>🎵</div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white text-sm">@{account?.username}</span>
              <CheckCircle size={12} className="text-emerald-400" />
              {account?.accountType && (
                <span className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: '#EE1D5220', color: '#EE1D52', border: '1px solid #EE1D5240' }}>
                  {account.accountType}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{account?.displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncData} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a2e] hover:bg-[#EE1D52]/10 text-gray-400 hover:text-[#EE1D52] text-xs transition-colors">
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync...' : 'Sync'}
          </button>
          <button onClick={disconnect} disabled={disconnecting}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Desconectar">
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
          <AlertCircle size={12} className="text-red-400" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Seguidores',  value: formatK(account?.followersCount ?? 0), icon: Users,      color: 'text-[#69C9D0]' },
          { label: 'Videos',      value: formatK(account?.mediaCount     ?? 0), icon: Video,      color: 'text-[#EE1D52]' },
          { label: 'Siguiendo',   value: formatK(account?.followingCount ?? 0), icon: TrendingUp, color: 'text-violet-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0d0d1a] rounded-lg p-2.5 text-center">
            <stat.icon size={13} className={cn('mx-auto mb-1', stat.color)} />
            <div className="text-sm font-bold text-white">{stat.value}</div>
            <div className="text-[10px] text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Growth + Views */}
      <div className="grid grid-cols-2 gap-2">
        {followerGrowth !== 0 && (
          <div className={cn(
            'flex items-center gap-2 p-2.5 rounded-lg text-xs col-span-1',
            followerGrowth > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          )}>
            <TrendingUp size={11} />
            <span>{followerGrowth > 0 ? '+' : ''}{followerGrowth} esta semana</span>
          </div>
        )}
        {totalViews7d > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs bg-[#EE1D52]/10 text-[#EE1D52] col-span-1">
            <Heart size={11} />
            <span>{formatK(totalViews7d)} vistas (7d)</span>
          </div>
        )}
        {latest?.engagement > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs bg-[#69C9D0]/10 text-[#69C9D0] col-span-2">
            <CheckCircle size={11} />
            <span>Engagement: {latest.engagement.toFixed(2)}%</span>
          </div>
        )}
      </div>

      {account?.lastSyncAt && (
        <p className="text-[10px] text-gray-600 text-center">
          Último sync: {new Date(account.lastSyncAt).toLocaleString('es-ES')}
        </p>
      )}
    </div>
  )
}
