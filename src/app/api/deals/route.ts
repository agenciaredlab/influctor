import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const deals = await prisma.brandDeal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(deals)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const { userId, brand, contact, email, phone, platform, type, stage, value,
    commissionPct, dueDate, description, deliverables, notes, tags, niche } = data

  if (!userId || !brand) return NextResponse.json({ error: 'userId and brand required' }, { status: 400 })

  const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const deal = await prisma.brandDeal.create({
    data: {
      userId: user.id, brand, contact: contact || null, email: email || null,
      phone: phone || null, platform, type, stage: stage || 'outreach',
      value: parseFloat(value || 0), commissionPct: commissionPct ? parseFloat(commissionPct) : null,
      dueDate: dueDate ? new Date(dueDate) : null, description: description || null,
      deliverables: deliverables || null, notes: notes || null,
      tags: tags || null, niche: niche || null,
    },
  })
  return NextResponse.json(deal, { status: 201 })
}
