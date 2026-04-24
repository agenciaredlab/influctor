import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/config'

const EXPIRES_MIN = 60

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where:  { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true, password: true },
    })

    // Always return 200 — don't reveal whether the email exists
    if (!user || !user.password) {
      return NextResponse.json({ ok: true })
    }

    // Generate a random token; store its SHA-256 hash
    const rawToken  = randomBytes(32).toString('hex')
    const hashToken = createHash('sha256').update(rawToken).digest('hex')
    const expires   = new Date(Date.now() + EXPIRES_MIN * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data:  { passwordResetToken: hashToken, passwordResetExpires: expires },
    })

    const base     = (await getAppUrl()) ?? 'http://localhost:3000'
    const resetUrl = `${base}/reset-password?token=${rawToken}`

    await sendPasswordResetEmail({
      userName:   user.name,
      userEmail:  user.email,
      resetUrl,
      expiresMin: EXPIRES_MIN,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[forgot-password]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
