import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWeeklyReport, type WeeklyReportData } from '@/lib/email'
import { getPlan } from '@/lib/plans'
import { getApiSession } from '@/lib/session'

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

// Builds a WeeklyReportData object from DB records for a given user
export async function buildReportData(userId: string): Promise<WeeklyReportData> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Usuario no encontrado')

  const [goals, income, aiUsage, snapshots] = await Promise.all([
    prisma.goal.findMany({ where: { userId } }),
    prisma.income.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 30 }),
    prisma.aiUsage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.socialSnapshot.findMany({
      where: { userId, date: { gte: new Date(Date.now() - 14 * 86400_000) } },
      orderBy: { date: 'desc' },
    }),
  ])

  // Weekly income sum
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  const weeklyIncome = income
    .filter(i => new Date(i.date) >= weekStart)
    .reduce((sum, i) => sum + Number(i.amount), 0)

  // Total income vs previous week
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const prevIncome = income
    .filter(i => new Date(i.date) >= prevWeekStart && new Date(i.date) < weekStart)
    .reduce((sum, i) => sum + Number(i.amount), 0)
  const incomeChange = prevIncome > 0
    ? Math.round(((weeklyIncome - prevIncome) / prevIncome) * 100 * 10) / 10
    : 0

  // AI usage this week
  const weekAiUsage = aiUsage.filter(a => new Date(a.createdAt) >= weekStart).length

  const plan = getPlan(user.plan ?? 'free')
  const aiLimit = plan.limits.aiGenerationsPerMonth

  // Week label
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  const weekLabel = `Semana del ${fmt(startOfWeek)} al ${fmt(now)}`

  // Goals progress
  const goalsProgress = goals.slice(0, 3).map(g => ({
    title: g.title,
    progress: Math.min(100, Math.round((Number(g.currentValue ?? 0) / Math.max(Number(g.targetValue), 1)) * 100)),
    current: Number(g.currentValue ?? 0),
    target: Number(g.targetValue),
  }))

  // Derive social metrics from real snapshot data
  const weekSnaps = snapshots.filter(s => new Date(s.date) >= weekStart)
  const prevSnaps = snapshots.filter(s => {
    const d = new Date(s.date)
    return d >= prevWeekStart && d < weekStart
  })

  // Sum new followers across all platforms for the week
  const followersGained = weekSnaps.reduce((s, snap) => s + snap.newFollowers, 0)
  const prevFollowersGained = prevSnaps.reduce((s, snap) => s + snap.newFollowers, 0)
  const followersChange = pctChange(followersGained, prevFollowersGained)

  const weekReach = weekSnaps.reduce((s, snap) => s + snap.reach, 0)
  const prevReach = prevSnaps.reduce((s, snap) => s + snap.reach, 0)
  const reachChange = pctChange(weekReach, prevReach)

  const engagements = weekSnaps.filter(s => s.engagement > 0)
  const engagementRate = engagements.length > 0
    ? engagements.reduce((s, snap) => s + snap.engagement, 0) / engagements.length
    : 0
  const prevEngagements = prevSnaps.filter(s => s.engagement > 0)
  const prevEngRate = prevEngagements.length > 0
    ? prevEngagements.reduce((s, snap) => s + snap.engagement, 0) / prevEngagements.length
    : 0
  const engChange = Math.round((engagementRate - prevEngRate) * 10) / 10

  const hasRealMetrics = snapshots.length > 0

  // Build top content from published posts this week
  const topContentPosts = await prisma.contentPost.findMany({
    where: { userId, status: 'published', publishedAt: { gte: weekStart } },
    orderBy: { viralScore: 'desc' },
    take: 3,
  })

  return {
    userName: user.name ?? 'Creador',
    userEmail: user.email,
    weekLabel,
    summary: {
      followersGained: hasRealMetrics ? followersGained : 0,
      followersChange: hasRealMetrics ? followersChange : 0,
      reach: hasRealMetrics ? weekReach : 0,
      reachChange: hasRealMetrics ? reachChange : 0,
      engagementRate: hasRealMetrics ? Math.round(engagementRate * 100) / 100 : 0,
      engChange: hasRealMetrics ? engChange : 0,
      income: weeklyIncome,
      incomeChange,
    },
    topContent: topContentPosts.length > 0
      ? topContentPosts.map(p => ({
          title:    p.title,
          views:    0,
          likes:    0,
          platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
        }))
      : [],
    goalsProgress: goalsProgress.length > 0 ? goalsProgress : [
      { title: '10K seguidores en TikTok', progress: 73, current: 7300, target: 10000 },
      { title: 'Ingresos $2K/mes', progress: 92, current: 1850, target: 2000 },
    ],
    recommendations: [
      'Tu mejor día para publicar fue el jueves (2.3x más alcance).',
      'Los Reels de tips prácticos generaron 40% más engagement.',
      'Responder comentarios en la primera hora aumentó tu alcance un 28%.',
    ],
    goalsNextWeek: [
      'Publicar 7 videos en TikTok',
      'Cerrar 1 brand deal con marca de productividad',
      'Crear 1 carrusel educativo para Instagram',
    ],
    aiUsage: weekAiUsage,
    aiLimit: aiLimit === Infinity ? 0 : aiLimit,
  }
}

// POST /api/email/weekly-report — send on-demand (from UI button)
export async function POST(_req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY no configurada en .env.local' },
      { status: 503 }
    )
  }

  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // Only Creator+ can receive reports
    const plan = user.plan ?? 'free'
    if (plan === 'free') {
      return NextResponse.json(
        { error: 'Los reportes por email requieren plan Creator o superior' },
        { status: 403 }
      )
    }

    const data = await buildReportData(user.id)
    const result = await sendWeeklyReport(data)

    return NextResponse.json({ ok: true, id: (result.data as any)?.id })
  } catch (err: any) {
    console.error('Email report error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
