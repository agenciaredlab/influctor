import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const { userId, title, description, category, platform, targetValue, currentValue, unit, deadline, priority, notes } = data

  if (!userId || !title) return NextResponse.json({ error: 'userId and title required' }, { status: 400 })

  // Calculate score based on progress
  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0

  const goal = await prisma.goal.create({
    data: {
      userId,
      title,
      description: description || null,
      category: category || 'followers',
      platform: platform || null,
      targetValue: parseFloat(targetValue),
      currentValue: parseFloat(currentValue || 0),
      unit: unit || '',
      deadline: deadline ? new Date(deadline) : null,
      priority: priority || 'medium',
      notes: notes || null,
      score: Math.min(100, progress),
    },
  })

  return NextResponse.json(goal, { status: 201 })
}
