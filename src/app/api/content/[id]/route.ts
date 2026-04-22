import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

async function ownedPost(id: string, userId: string) {
  return prisma.contentPost.findFirst({ where: { id, userId } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const existing = await ownedPost(params.id, sessionUser.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { title, platform, type, status, scheduledAt, caption, hashtags, hookText, imageUrl, notes } = await req.json()

  const post = await prisma.contentPost.update({
    where: { id: params.id },
    data: {
      title, platform, type, status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      caption:  caption  || null,
      hashtags: hashtags || null,
      hookText: hookText || null,
      imageUrl: imageUrl || null,
      notes:    notes    || null,
    },
  })
  return NextResponse.json(post)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const existing = await ownedPost(params.id, sessionUser.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const rawData = await req.json()
  const { userId: _uid, id: _id, ...data } = rawData
  const post = await prisma.contentPost.update({ where: { id: params.id }, data })
  return NextResponse.json(post)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const existing = await ownedPost(params.id, sessionUser.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.contentPost.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
