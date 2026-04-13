import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()
  const { brand, contact, email, phone, platform, type, stage, value,
    commissionPct, dueDate, description, deliverables, notes, tags, niche } = data

  const deal = await prisma.brandDeal.update({
    where: { id: params.id },
    data: {
      brand, contact: contact || null, email: email || null, phone: phone || null,
      platform, type, stage, value: parseFloat(value || 0),
      commissionPct: commissionPct ? parseFloat(commissionPct) : null,
      dueDate: dueDate ? new Date(dueDate) : null, description: description || null,
      deliverables: deliverables || null, notes: notes || null,
      tags: tags || null, niche: niche || null,
    },
  })
  return NextResponse.json(deal)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()
  const deal = await prisma.brandDeal.update({ where: { id: params.id }, data })
  return NextResponse.json(deal)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.brandDeal.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
