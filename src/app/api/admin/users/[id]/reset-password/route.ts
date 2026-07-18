import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getApiSession()
  if (!session) return null
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { isAdmin: true } })
  return user?.isAdmin ? session : null
}

function randomPassword(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

// POST /api/admin/users/[id]/reset-password — generates a new password,
// returns it in plain text ONCE. The admin must relay it manually.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const target = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const plainPassword = randomPassword(12)
    const hashed = await bcrypt.hash(plainPassword, 12)

    await prisma.user.update({
      where: { id: params.id },
      data:  { password: hashed },
    })

    return NextResponse.json({ password: plainPassword })
  } catch (err) {
    console.error('[admin/users/[id]/reset-password POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}