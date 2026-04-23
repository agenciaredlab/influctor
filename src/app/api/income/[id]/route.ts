import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

async function ownedIncome(id: string, userId: string) {
  return prisma.income.findFirst({ where: { id, userId } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const existing = await ownedIncome(params.id, sessionUser.id)
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const { amount, source, platform, description, date } = await req.json()

    if (!amount || !source || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const income = await prisma.income.update({
      where: { id: params.id },
      data: {
        amount:      parseFloat(amount),
        source,
        platform:    platform    || null,
        description: description || null,
        date:        new Date(date),
      },
    })

    return NextResponse.json(income)
  } catch (err) {
    console.error('[income/[id] PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const existing = await ownedIncome(params.id, sessionUser.id)
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await prisma.income.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[income/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
