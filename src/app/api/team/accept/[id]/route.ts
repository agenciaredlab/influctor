import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// GET /api/team/accept/[id] — public. Lets the accept page show "X te invitó" before any login.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const membership = await prisma.teamMembership.findUnique({
      where:   { id: params.id },
      include: { owner: { select: { name: true } } },
    })
    if (!membership || membership.status !== 'pending') {
      return NextResponse.json({ error: 'Invitación no válida o ya usada' }, { status: 404 })
    }
    return NextResponse.json({ invitedEmail: membership.invitedEmail, ownerName: membership.owner.name })
  } catch (err) {
    console.error('[team/accept/[id] GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/team/accept/[id] — public. Body: { name, password }. Creates the User and
// activates the membership in one transaction — no trial/plan of their own, they always
// work on the owner's account (see lib/session.ts resolveAccount()).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const membership = await prisma.teamMembership.findUnique({ where: { id: params.id } })
    if (!membership || membership.status !== 'pending') {
      return NextResponse.json({ error: 'Invitación no válida o ya usada' }, { status: 404 })
    }

    const { name, password } = await req.json()
    if (!name?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Nombre y contraseña son obligatorios' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: membership.invitedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'Ese correo ya tiene una cuenta de Influctor' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: name.trim(), email: membership.invitedEmail, password: hashed },
      })
      await tx.teamMembership.update({
        where: { id: membership.id },
        data:  { memberId: user.id, status: 'active', acceptedAt: new Date() },
      })
    })

    return NextResponse.json({ ok: true, email: membership.invitedEmail })
  } catch (err) {
    console.error('[team/accept/[id] POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
