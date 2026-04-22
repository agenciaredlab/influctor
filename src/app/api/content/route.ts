import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const posts = await prisma.contentPost.findMany({
    where:   { userId: sessionUser.id },
    orderBy: { scheduledAt: 'asc' },
    take:    500,
  })
  return NextResponse.json(posts)
}

export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const data = await req.json()
  const { title, platform, type, status, scheduledAt, caption, hashtags, hookText, imageUrl, notes } = data

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const post = await prisma.contentPost.create({
    data: {
      userId: sessionUser.id, title, platform, type, status: status || 'idea',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      caption: caption || null, hashtags: hashtags || null,
      hookText: hookText || null, imageUrl: imageUrl || null,
      notes: notes || null,
    },
  })
  return NextResponse.json(post, { status: 201 })
}
