import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const incomes = await prisma.income.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(incomes)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const { userId, amount, source, platform, description, date } = data

  if (!userId || !amount || !source || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get userId from session or use provided (demo)
  const user = await prisma.user.findFirst({
    where: { email: 'demo@influctor.app' },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const income = await prisma.income.create({
    data: {
      userId: user.id,
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
