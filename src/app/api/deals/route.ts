import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const deals = await prisma.brandDeal.findMany({
    where:   { userId: sessionUser.id },
    orderBy: { createdAt: 'desc' },
    take:    200,
  })
  return NextResponse.json(deals)
}

export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const data = await req.json()
  const { brand, contact, email, phone, platform, type, stage, value,
    commissionPct, dueDate, description, deliverables, notes, tags, niche } = data

  if (!brand) return NextResponse.json({ error: 'brand required' }, { status: 400 })

  const deal = await prisma.brandDeal.create({
    data: {
      userId: sessionUser.id, brand, contact: contact || null, email: email || null,
      phone: phone || null, platform, type, stage: stage || 'outreach',
      value: parseFloat(value || 0), commissionPct: commissionPct ? parseFloat(commissionPct) : null,
      dueDate: dueDate ? new Date(dueDate) : null, description: description || null,
      deliverables: deliverables || null, notes: notes || null,
      tags: tags || null, niche: niche || null,
    },
  })
  return NextResponse.json(deal, { status: 201 })
}
