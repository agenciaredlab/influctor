import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { sendGoalAchievedNotification } from '@/lib/email'

async function ownedGoal(id: string, userId: string) {
  return prisma.goal.findFirst({ where: { id, userId } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const existing = await ownedGoal(params.id, sessionUser.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const data = await req.json()
  const { title, description, category, platform, targetValue, currentValue, unit, deadline, priority, notes, status } = data

  const newProgress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0

  const goal = await prisma.goal.update({
    where: { id: params.id },
    data: {
      title,
      description: description || null,
      category,
      platform:     platform     || null,
      targetValue:  parseFloat(targetValue),
      currentValue: parseFloat(currentValue || 0),
      unit:         unit         || '',
      deadline:     deadline ? new Date(deadline) : null,
      priority,
      notes:        notes        || null,
      score:        Math.min(100, newProgress),
      status:       status       || 'active',
    },
  })

  // Fire-and-forget: notify when a goal is first completed
  if (newProgress >= 100 && (existing.score ?? 0) < 100 && sessionUser.email) {
    sendGoalAchievedNotification({
      userName:    sessionUser.name ?? 'Creador',
      userEmail:   sessionUser.email,
      goalTitle:   title,
      targetValue: parseFloat(targetValue),
      unit:        unit || '',
      category,
    })?.catch(() => {})
  }

  return NextResponse.json(goal)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const existing = await ownedGoal(params.id, sessionUser.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const data = await req.json()
  const goal = await prisma.goal.update({ where: { id: params.id }, data })
  return NextResponse.json(goal)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const existing = await ownedGoal(params.id, sessionUser.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.goal.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
