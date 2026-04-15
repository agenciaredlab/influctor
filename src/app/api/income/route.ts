import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const incomes = await prisma.income.findMany({
    where: { userId: sessionUser.id },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(incomes)
}

export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const data = await req.json()
  const { amount, source, platform, description, date } = data

  if (!amount || !source || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const income = await prisma.income.create({
    data: {
      userId: sessionUser.id,
      amount: parseFloat(amount),
      source,
      platform: platform || null,
      description: description || null,
      date: new Date(date),
      currency: 'USD',
      paid: true,
    },
  })

  return NextResponse.json(income, { status: 201 })
}
