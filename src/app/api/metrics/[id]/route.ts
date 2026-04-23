import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

async function ownedMetric(id: string, userId: string) {
  return prisma.socialMetric.findFirst({ where: { id, userId } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const existing = await ownedMetric(params.id, sessionUser.id)
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const {
      platform, date, followers, following, posts,
      engagement, reach, impressions, views, likes, comments, shares,
    } = await req.json()

    const metric = await prisma.socialMetric.update({
      where: { id: params.id },
      data: {
        platform,
        date:       new Date(date),
        followers:  parseInt(followers  || 0),
        following:  parseInt(following  || 0),
        posts:      parseInt(posts      || 0),
        engagement: parseFloat(engagement || 0),
        reach:      parseInt(reach      || 0),
        impressions:parseInt(impressions|| 0),
        views:      parseInt(views      || 0),
        likes:      parseInt(likes      || 0),
        comments:   parseInt(comments   || 0),
        shares:     parseInt(shares     || 0),
      },
    })
    return NextResponse.json(metric)
  } catch (err) {
    console.error('[metrics/[id] PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const existing = await ownedMetric(params.id, sessionUser.id)
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await prisma.socialMetric.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[metrics/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
