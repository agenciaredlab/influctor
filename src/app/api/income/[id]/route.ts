import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json()
  const { amount, source, platform, description, date } = data

  const income = await prisma.income.update({
    where: { id: params.id },
    data: {
      amount: parseFloat(amount),
      source,
      platform: platform || null,
      description: description || null,
      date: new Date(date),
    },
  })

  return NextResponse.json(income)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.income.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
