import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { getPlan } from '@/lib/plans'
import { getAccountUser } from '@/lib/account'

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const posts = await prisma.contentPost.findMany({
      where:   { userId: sessionUser.accountId },
      orderBy: { scheduledAt: 'asc' },
      take:    500,
    })
    return NextResponse.json(posts)
  } catch (err) {
    console.error('[content GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!sessionUser.permissions.canManageContent) return NextResponse.json({ error: 'No tienes permiso para gestionar el contenido' }, { status: 403 })

    // The plan (and its limits) belong to the account OWNER, not to whoever is logged in.
    const owner = await getAccountUser(sessionUser.accountId)
    const limit = getPlan(owner?.plan ?? 'free').limits.contentPosts
    if (limit !== Infinity) {
      const count = await prisma.contentPost.count({ where: { userId: sessionUser.accountId } })
      if (count >= limit) {
        return NextResponse.json(
          { error: `Tu plan permite hasta ${limit} posts en el calendario. Actualiza tu plan para crear más.` },
          { status: 403 }
        )
      }
    }

    const data = await req.json()
    const { title, platform, type, status, scheduledAt, caption, hashtags, hookText, imageUrl, notes } = data

    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

    const post = await prisma.contentPost.create({
      data: {
        userId: sessionUser.accountId, title, platform, type, status: status || 'idea',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        caption: caption || null, hashtags: hashtags || null,
        hookText: hookText || null, imageUrl: imageUrl || null,
        notes: notes || null,
      },
    })
    return NextResponse.json(post, { status: 201 })
  } catch (err) {
    console.error('[content POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
