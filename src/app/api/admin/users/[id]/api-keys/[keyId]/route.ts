import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getApiSession()
  if (!session) return null
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { isAdmin: true } })
  return user?.isAdmin ? session : null
}

// DELETE /api/admin/users/[id]/api-keys/[keyId] — revoke (soft-delete) a key
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; keyId: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const key = await prisma.apiKey.findUnique({ where: { id: params.keyId } })
    if (!key || key.userId !== params.id) {
      return NextResponse.json({ error: 'Key no encontrada' }, { status: 404 })
    }

    await prisma.apiKey.update({ where: { id: params.keyId }, data: { revokedAt: new Date() } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/users/[id]/api-keys/[keyId] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}