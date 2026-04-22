import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20')))
  const skip  = (page - 1) * limit

  const [data, total] = await prisma.$transaction([
    prisma.goal.findMany({
      where: { userId: sessionUser.id },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip,
    }),
    prisma.goal.count({ where: { userId: sessionUser.id } }),
  ])

  return NextResponse.json({ data, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const { title, description, category, platform, targetValue, currentValue, unit, deadline, priority, notes } = body

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0

  const goal = await prisma.goal.create({
    data: {
      userId:       sessionUser.id,
      title,
      description:  description  || null,
      category:     category     || 'followers',
      platform:     platform     || null,
      targetValue:  parseFloat(targetValue  || 0),
      currentValue: parseFloat(currentValue || 0),
      unit:         unit         || '',
      deadline:     deadline ? new Date(deadline) : null,
      priority:     priority     || 'medium',
      notes:        notes        || null,
      score:        Math.min(100, progress),
    },
  })

  return NextResponse.json(goal, { status: 201 })
}
