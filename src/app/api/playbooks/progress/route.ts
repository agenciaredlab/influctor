import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { userId, playbookId, checklistId, completed } = await req.json()

  if (!userId || !playbookId || !checklistId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const record = await prisma.playbookProgress.upsert({
    where: { userId_playbookId_checklistId: { userId: user.id, playbookId, checklistId } },
    update: { completed, completedAt: completed ? new Date() : null },
    create: { userId: user.id, playbookId, checklistId, completed, completedAt: completed ? new Date() : null },
  })
  return NextResponse.json(record)
}
