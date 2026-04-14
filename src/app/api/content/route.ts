import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const posts = await prisma.contentPost.findMany({ where: { userId }, orderBy: { scheduledAt: 'asc' } })
  return NextResponse.json(posts)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const { userId, title, platform, type, status, scheduledAt, caption, hashtags, hookText, imageUrl, notes } = data

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const post = await prisma.contentPost.create({
    data: {
      userId: user.id, title, platform, type, status: status || 'idea',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      caption: caption || null, hashtags: hashtags || null,
      hookText: hookText || null, imageUrl: imageUrl || null,
      notes: notes || null,
    },
  })
  return NextResponse.json(post, { status: 201 })
}
