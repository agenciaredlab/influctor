import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

const PERMISSION_KEYS = [
  'canManageContent', 'canManageDeals', 'canManageCompetitors',
  'canConnectSocialAccounts', 'canUseAI', 'canViewIncome',
] as const

async function requireOwner() {
  const session = await getApiSession()
  if (!session) return null
  if (session.accountId !== session.id) return null
  return session
}

// PATCH /api/team/[id] — owner edits a member's permissions. Body: any subset of the 6 booleans.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await requireOwner()
    if (!owner) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const membership = await prisma.teamMembership.findUnique({ where: { id: params.id } })
    if (!membership || membership.ownerId !== owner.id) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const data: Record<string, boolean> = {}
    for (const key of PERMISSION_KEYS) {
      if (typeof body?.[key] === 'boolean') data[key] = body[key]
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 })
    }

    const updated = await prisma.teamMembership.update({ where: { id: params.id }, data })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[team/[id] PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/team/[id] — owner removes a member (or cancels a pending invite).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await requireOwner()
    if (!owner) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const membership = await prisma.teamMembership.findUnique({ where: { id: params.id } })
    if (!membership || membership.ownerId !== owner.id) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    await prisma.teamMembership.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[team/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
