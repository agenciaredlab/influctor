import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { transferAdminRole } from '@/lib/admin'

async function requireAdmin() {
  const session = await getApiSession()
  if (!session) return null
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { isAdmin: true } })
  return user?.isAdmin ? session : null
}

// POST /api/admin/users/[id]/transfer-admin — body: { confirmEmail: string }
// The ONLY route in the app that can change who isAdmin. Requires
// re-typing the target's email as a destructive-action confirmation.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    if (params.id === admin.id) {
      return NextResponse.json({ error: 'Ya eres el admin' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true, active: true } })
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (!target.active) return NextResponse.json({ error: 'No puedes transferir el rol a una cuenta desactivada' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    if (body.confirmEmail?.toLowerCase().trim() !== target.email.toLowerCase()) {
      return NextResponse.json({ error: 'El email de confirmación no coincide' }, { status: 400 })
    }

    await transferAdminRole(target.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/users/[id]/transfer-admin POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}