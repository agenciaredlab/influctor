import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function GET(_req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const metrics = await prisma.socialMetric.findMany({
    where:   { userId: sessionUser.id },
    orderBy: { date: 'desc' },
    take:    200,
  })
  return NextResponse.json(metrics)
}

export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const {
    platform, date, followers, following, posts,
    engagement, reach, impressions, views, likes, comments, shares,
  } = await req.json()

  if (!platform || !date) {
    return NextResponse.json({ error: 'platform y date son requeridos' }, { status: 400 })
  }

  const metric = await prisma.socialMetric.create({
    data: {
      userId:     sessionUser.id,
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
  return NextResponse.json(metric, { status: 201 })
}
