import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

async function ownedCampaign(id: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id, userId } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const existing = await ownedCampaign(params.id, sessionUser.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const {
    name, description, objective, platform, budget, spent,
    startDate, endDate, status, impressions, reach, engagement,
    conversions, clicks, tags,
  } = await req.json()

  const campaign = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      name,
      description:  description || null,
      objective,
      platform,
      budget:       parseFloat(budget    || 0),
      spent:        parseFloat(spent     || 0),
      startDate:    startDate ? new Date(startDate) : new Date(),
      endDate:      endDate   ? new Date(endDate)   : null,
      status,
      impressions:  parseInt(impressions || 0),
      reach:        parseInt(reach       || 0),
      engagement:   parseInt(engagement  || 0),
      conversions:  parseInt(conversions || 0),
      clicks:       parseInt(clicks      || 0),
      tags:         tags || null,
    },
  })

  return NextResponse.json(campaign)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const existing = await ownedCampaign(params.id, sessionUser.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const data = await req.json()
  const campaign = await prisma.campaign.update({ where: { id: params.id }, data })
  return NextResponse.json(campaign)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const existing = await ownedCampaign(params.id, sessionUser.id)
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.campaign.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
