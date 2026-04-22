import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20')))
  const skip  = (page - 1) * limit

  const [data, total] = await prisma.$transaction([
    prisma.campaign.findMany({
      where: { userId: sessionUser.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      skip,
    }),
    prisma.campaign.count({ where: { userId: sessionUser.id } }),
  ])

  return NextResponse.json({ data, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const {
    name, description, objective, platform, budget, spent,
    startDate, endDate, status, impressions, reach, engagement,
    conversions, clicks, tags,
  } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const campaign = await prisma.campaign.create({
    data: {
      userId:      sessionUser.id,
      name,
      description: description || null,
      objective:   objective   || 'growth',
      platform:    platform    || 'instagram',
      budget:      parseFloat(budget    || 0),
      spent:       parseFloat(spent     || 0),
      startDate:   startDate ? new Date(startDate) : new Date(),
      endDate:     endDate   ? new Date(endDate)   : null,
      status:      status      || 'draft',
      impressions: parseInt(impressions || 0),
      reach:       parseInt(reach       || 0),
      engagement:  parseInt(engagement  || 0),
      conversions: parseInt(conversions || 0),
      clicks:      parseInt(clicks      || 0),
      tags:        tags        || null,
    },
  })

  return NextResponse.json(campaign, { status: 201 })
}
