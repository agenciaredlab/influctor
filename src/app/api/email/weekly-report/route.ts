import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWeeklyReport, type WeeklyReportData } from '@/lib/email'
import { getPlan } from '@/lib/plans'

// Builds a WeeklyReportData object from DB records for a given user
export async function buildReportData(userId: string): Promise<WeeklyReportData> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Usuario no encontrado')

  const [goals, income, aiUsage] = await Promise.all([
    prisma.goal.findMany({ where: { userId } }),
    prisma.income.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 30 }),
    prisma.aiUsage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
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

  // Static demo data for metrics not yet tracked in real-time
  return {
    userName: user.name ?? 'Creador',
    userEmail: user.email,
    weekLabel,
    summary: {
      followersGained: 1240,
      followersChange: 18.3,
      reach: 48200,
      reachChange: 12.1,
      engagementRate: 4.7,
      engChange: 0.3,
      income: weeklyIncome > 0 ? weeklyIncome : 1850,
      incomeChange: incomeChange !== 0 ? incomeChange : 22.0,
    },
    topContent: [
      { title: 'Cómo gané $5K en mi primer mes como creador', views: 24300, likes: 1820, platform: 'TikTok' },
      { title: '5 herramientas de IA que uso cada día', views: 18700, likes: 1340, platform: 'Instagram' },
      { title: 'Mi rutina mañanera que cambió mi productividad', views: 9400, likes: 720, platform: 'Instagram' },
    ],
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
    const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
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
