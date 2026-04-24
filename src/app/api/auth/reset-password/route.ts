import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token y contraseña requeridos' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const hashToken = createHash('sha256').update(token).digest('hex')

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken:   hashToken,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'El enlace es inválido o ya expiró. Solicita uno nuevo.' },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data:  {
        password:             hashed,
        passwordResetToken:   null,
        passwordResetExpires: null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
