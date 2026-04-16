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
    prisma.income.findMany({
      where: { userId: sessionUser.id },
      orderBy: { date: 'desc' },
      take: limit,
      skip,
    }),
    prisma.income.count({ where: { userId: sessionUser.id } }),
  ])

  return NextResponse.json({ data, total, page, limit, pages: Math.ceil(total / limit) })
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
