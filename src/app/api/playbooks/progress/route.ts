import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { playbookId, checklistId, completed } = await req.json()

    if (!playbookId || !checklistId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const record = await prisma.playbookProgress.upsert({
      where: { userId_playbookId_checklistId: { userId: sessionUser.id, playbookId, checklistId } },
      update: { completed, completedAt: completed ? new Date() : null },
      create: { userId: sessionUser.id, playbookId, checklistId, completed, completedAt: completed ? new Date() : null },
    })
    return NextResponse.json(record)
  } catch (err) {
    console.error('[playbooks/progress POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
