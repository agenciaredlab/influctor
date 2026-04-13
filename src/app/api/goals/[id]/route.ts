import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()
  const { title, description, category, platform, targetValue, currentValue, unit, deadline, priority, notes, status } = data

  const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0

  const goal = await prisma.goal.update({
    where: { id: params.id },
    data: {
      title,
      description: description || null,
      category,
      platform: platform || null,
      targetValue: parseFloat(targetValue),
      currentValue: parseFloat(currentValue || 0),
      unit: unit || '',
      deadline: deadline ? new Date(deadline) : null,
      priority,
      notes: notes || null,
      score: Math.min(100, progress),
      status: status || 'active',
    },
  })

  return NextResponse.json(goal)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()
  const goal = await prisma.goal.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(goal)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.goal.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
