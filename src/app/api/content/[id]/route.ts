import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()
  const { title, platform, type, status, scheduledAt, caption, hashtags, hookText, imageUrl, notes } = data

  const post = await prisma.contentPost.update({
    where: { id: params.id },
    data: {
      title, platform, type, status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      caption: caption || null, hashtags: hashtags || null,
      hookText: hookText || null, imageUrl: imageUrl || null,
      notes: notes || null,
    },
  })
  return NextResponse.json(post)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()
  const post = await prisma.contentPost.update({ where: { id: params.id }, data })
  return NextResponse.json(post)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contentPost.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
