import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getPlan } from '@/lib/plans'

async function requireAdmin() {
  const session = await getApiSession()
  if (!session) return null
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { isAdmin: true } })
  return user?.isAdmin ? session : null
}

const VALID_PLANS = new Set(['free', 'creator', 'pro'])

// GET /api/admin/users/[id] — detail with activity counts
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, plan: true, planStatus: true,
        isAdmin: true, active: true, createdAt: true, trialEndsAt: true,
        aiUsageThisMonth: true,
        _count: {
          select: { contentPosts: true, brandDeals: true, incomes: true, socialAccounts: true },
        },
      },
    })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    return NextResponse.json({ user })
  } catch (err) {
    console.error('[admin/users/[id] GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/users/[id] — body: { plan?, active? }. Never accepts isAdmin.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json()
    const data: { plan?: string; active?: boolean } = {}

    if (body.plan !== undefined) {
      if (!VALID_PLANS.has(body.plan)) {
        return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
      }
      data.plan = body.plan
    }
    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') {
        return NextResponse.json({ error: 'active debe ser boolean' }, { status: 400 })
      }
      if (params.id === admin.id && body.active === false) {
        return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta' }, { status: 400 })
      }
      data.active = body.active
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, plan: true, active: true },
    })

    return NextResponse.json({ user: updated, plan: getPlan(updated.plan).name })
  } catch (err) {
    console.error('[admin/users/[id] PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    if (params.id === admin.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/users/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}