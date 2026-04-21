import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { getPlan } from '@/lib/plans'

export async function GET(_req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const contracts = await prisma.contract.findMany({
    where:   { userId: sessionUser.id },
    orderBy: { createdAt: 'desc' },
    select:  { id: true, title: true, type: true, createdAt: true },
  })

  return NextResponse.json(contracts)
}

export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Gate: only Creator+ plans
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const plan = getPlan(user.plan)
  if (!plan.limits.canAccessContracts) {
    return NextResponse.json(
      { error: 'Función exclusiva del plan Creator. Actualiza en /pricing.' },
      { status: 403 }
    )
  }

  const { title, type, fields, content } = await req.json()
  if (!title?.trim() || !type || !content?.trim()) {
    return NextResponse.json({ error: 'title, type y content son requeridos' }, { status: 400 })
  }

  const contract = await prisma.contract.create({
    data: {
      title:   title.trim(),
      type,
      fields:  typeof fields === 'string' ? fields : JSON.stringify(fields ?? {}),
      content,
      userId:  sessionUser.id,
    },
  })

  return NextResponse.json(contract, { status: 201 })
}
