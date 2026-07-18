import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son obligatorios' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 })
    }

    const TRIAL_DAYS  = 7
    const hashed      = await bcrypt.hash(password, 12)
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86400_000)

    // Serializable transaction: the "am I the first user" check and the
    // insert happen atomically, so two near-simultaneous registrations
    // before any user exists can never both end up isAdmin: true.
    const user = await prisma.$transaction(
      async (tx) => {
        const userCount = await tx.user.count()
        return tx.user.create({
          data: {
            name:        name.trim(),
            email:       email.toLowerCase().trim(),
            password:    hashed,
            isAdmin:     userCount === 0,
            plan:        'creator',
            planStatus:  'trialing',
            trialEndsAt,
          },
        })
      },
      { isolationLevel: 'Serializable' }
    )

    // Fire-and-forget — don't fail registration if email fails
    sendWelcomeEmail({ userName: user.name, userEmail: user.email, trialDays: TRIAL_DAYS })
      .catch(err => console.error('[register] welcome email failed:', err))

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
  } catch (err: any) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
  }
}
