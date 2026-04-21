import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function GET() {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const analyses = await prisma.viralAnalysis.findMany({
    where:   { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take:    20,
    select:  { id: true, platform: true, format: true, hook: true, score: true, factors: true, suggestions: true, createdAt: true },
  })

  return NextResponse.json({ analyses })
}

export async function POST(req: NextRequest) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { platform, format, hook, score, factors, suggestions } = await req.json()

  const analysis = await prisma.viralAnalysis.create({
    data: {
      platform,
      format:      format ?? '',
      hook:        hook ?? '',
      score:       Math.round(score),
      factors:     JSON.stringify(factors),
      suggestions: JSON.stringify(suggestions),
      userId:      session.id,
    },
  })

  return NextResponse.json({ id: analysis.id }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getApiSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const analysis = await prisma.viralAnalysis.findFirst({ where: { id, userId: session.id } })
  if (!analysis) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.viralAnalysis.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
