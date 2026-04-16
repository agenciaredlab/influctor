import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1'))
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20')))
  const skip  = (page - 1) * limit

  const [data, total] = await prisma.$transaction([
    prisma.campaign.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      skip,
    }),
    prisma.campaign.count({ where: { userId } }),
  ])

  return NextResponse.json({ data, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const {
    userId, name, description, objective, platform, budget, spent,
    startDate, endDate, status, impressions, reach, engagement,
    conversions, clicks, tags
  } = data

  if (!userId || !name) return NextResponse.json({ error: 'userId and name required' }, { status: 400 })

  const campaign = await prisma.campaign.create({
    data: {
      userId,
      name,
      description: description || null,
      objective: objective || 'growth',
      platform: platform || 'instagram',
      budget: parseFloat(budget || 0),
      spent: parseFloat(spent || 0),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status: status || 'draft',
      impressions: parseInt(impressions || 0),
      reach: parseInt(reach || 0),
      engagement: parseInt(engagement || 0),
      conversions: parseInt(conversions || 0),
      clicks: parseInt(clicks || 0),
      tags: tags || null,
    },
  })

  return NextResponse.json(campaign, { status: 201 })
}
