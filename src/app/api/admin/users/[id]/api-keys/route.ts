import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/apiKey'

async function requireAdmin() {
  const session = await getApiSession()
  if (!session) return null
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { isAdmin: true } })
  return user?.isAdmin ? session : null
}

// GET /api/admin/users/[id]/api-keys — list keys for a user (never returns the raw key or hash)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const keys = await prisma.apiKey.findMany({
      where: { userId: params.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, keyPrefix: true, label: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    })

    return NextResponse.json({ keys })
  } catch (err) {
    console.error('[admin/users/[id]/api-keys GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/users/[id]/api-keys — body: { label? }. Returns the raw key ONCE.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const { raw, hash, prefix } = generateApiKey()

    await prisma.apiKey.create({
      data: {
        keyHash:   hash,
        keyPrefix: prefix,
        label:     typeof body.label === 'string' ? body.label.slice(0, 100) : null,
        userId:    target.id,
      },
    })

    return NextResponse.json({ key: raw })
  } catch (err) {
    console.error('[admin/users/[id]/api-keys POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}