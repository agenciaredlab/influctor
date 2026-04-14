'use client'

import { useState } from 'react'
import { RefreshCw, TrendingUp, Users, Eye, Heart, BarChart2, Link, CheckCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Snapshot {
  date: string
  followers: number
  reach: number
  impressions: number
  profileViews: number
  newFollowers: number
}

interface InstagramStatsBarProps {
  account: {
    username: string
    displayName: string | null
    profilePicture: string | null
    followersCount: number
    followingCount: number
    mediaCount: number
    accountType: string | null
    lastSyncAt: string | null
  }
  snapshots: Snapshot[]
  topMedia: {
    igMediaId: string
    mediaType: string
    caption: string | null
    permalink: string | null
    likeCount: number
    commentsCount: number
    reach: number
    impressions: number
    videoViews: number
    timestamp: string
  }[]
}

function formatK(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

export default function InstagramStatsBar({ account, snapshots, topMedia }: InstagramStatsBarProps) {
  const [syncing, setSyncing] = useState(false)
  const [showMedia, setShowMedia] = useState(false)

  const latest = snapshots[0]
  const weekAgo = snapshots[6]
  const followerGrowth = weekAgo ? account.followersCount - weekAgo.followers : 0
  const reachTotal = snapshots.slice(0, 7).reduce((sum, s) => sum + (s.reach || 0), 0)
  const impressionsTotal = snapshots.slice(0, 7).reduce((sum, s) => sum + (s.impressions || 0), 0)

  async function sync() {
    setSyncing(true)
    try {
      await fetch('/api/social/instagram/sync', { method: 'POST' })
      window.location.reload()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-[#1a0a2e] to-[#0d1a2e] border border-violet-500/20 rounded-2xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {account.profilePicture ? (
            <img src={account.profilePicture} alt={account.username} className="w-10 h-10 rounded-full object-cover ring-2 ring-pink-500/30" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)' }}>
              📸
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">@{account.username}</span>
              <CheckCircle size={13} className="text-emerald-400" />
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'linear-gradient(135deg, #f09433 0%, #bc1888 100%)', color: 'white' }}>
                Instagram {account.accountType}
              </span>
            </div>
            <p className="text-xs text-gray-400">{account.displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Actualizar'}
          </button>
          <button
            onClick={() => setShowMedia(!showMedia)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors"
          >
            <BarChart2 size={11} />
            {showMedia ? 'Ocultar posts' : 'Ver posts'}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: 'Seguidores',
            value: formatK(account.followersCount),
            sub: followerGrowth !== 0 ? `${followerGrowth > 0 ? '+' : ''}${followerGrowth} esta semana` : 'Sin cambios',
            subColor: followerGrowth > 0 ? 'text-emerald-400' : followerGrowth < 0 ? 'text-red-400' : 'text-gray-500',
            icon: Users,
            color: 'text-violet-400',
          },
          {
            label: 'Posts totales',
            value: formatK(account.mediaCount),
            sub: 'publicados',
            subColor: 'text-gray-500',
            icon: Eye,
            color: 'text-pink-400',
          },
          {
            label: 'Alcance (7d)',
            value: reachTotal > 0 ? formatK(reachTotal) : '—',
            sub: reachTotal > 0 ? 'personas únicas' : 'Sync para ver datos',
            subColor: 'text-gray-500',
            icon: TrendingUp,
            color: 'text-blue-400',
          },
          {
            label: 'Impresiones (7d)',
            value: impressionsTotal > 0 ? formatK(impressionsTotal) : '—',
            sub: impressionsTotal > 0 ? 'total de vistas' : 'Sync para ver datos',
            subColor: 'text-gray-500',
            icon: BarChart2,
            color: 'text-amber-400',
          },
          {
            label: 'Siguiendo',
            value: formatK(account.followingCount),
            sub: `ratio ${(account.followersCount / Math.max(account.followingCount, 1)).toFixed(1)}x`,
            subColor: 'text-gray-500',
            icon: Link,
            color: 'text-cyan-400',
          },
        ].map(stat => (
          <div key={stat.label} className="bg-black/20 rounded-xl p-3">
            <stat.icon size={13} className={cn('mb-1.5', stat.color)} />
            <div className="text-base font-bold text-white">{stat.value}</div>
            <div className="text-[10px] text-gray-400">{stat.label}</div>
            <div className={cn('text-[9px] mt-0.5', stat.subColor)}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Top Posts */}
      {showMedia && topMedia.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <Heart size={11} className="text-pink-400" />
            Top posts (por likes)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {topMedia.slice(0, 6).map(post => (
              <div key={post.igMediaId} className="bg-black/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase">
                    {post.mediaType === 'CAROUSEL_ALBUM' ? '📸 Carrusel' : post.mediaType === 'VIDEO' ? '🎥 Video' : post.mediaType === 'REEL' ? '🎵 Reel' : '📸 Foto'}
                  </span>
                  {post.permalink && (
                    <a href={post.permalink} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-violet-400 transition-colors">
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                {post.caption && (
                  <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">{post.caption}</p>
                )}
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-pink-400 flex items-center gap-0.5">❤️ {formatK(post.likeCount)}</span>
                  <span className="text-blue-400 flex items-center gap-0.5">💬 {formatK(post.commentsCount)}</span>
                  {post.videoViews > 0 && <span className="text-amber-400">▶️ {formatK(post.videoViews)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {account.lastSyncAt && (
        <p className="text-[10px] text-gray-600 mt-3">
          Datos reales de Instagram · Último sync: {new Date(account.lastSyncAt).toLocaleString('es-ES')}
        </p>
      )}
    </div>
  )
}
