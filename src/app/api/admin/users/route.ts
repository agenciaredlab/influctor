import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getApiSession()
  if (!session) return null
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { isAdmin: true } })
  return user?.isAdmin ? session : null
}

// GET /api/admin/users?query=&plan=&status=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const query  = req.nextUrl.searchParams.get('query')?.trim() ?? ''
    const plan   = req.nextUrl.searchParams.get('plan')   ?? ''
    const status = req.nextUrl.searchParams.get('status') ?? '' // 'active' | 'inactive'
    const page   = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1'))
    const limit  = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20')))
    const skip   = (page - 1) * limit

    const where: any = {}
    if (query) {
      where.OR = [
        { name:  { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ]
    }
    if (plan)   where.plan = plan
    if (status) where.active = status === 'active'

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true, name: true, email: true, plan: true, planStatus: true,
          isAdmin: true, active: true, createdAt: true, aiUsageThisMonth: true,
        },
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({ data, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('[admin/users GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}