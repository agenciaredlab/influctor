import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await prisma.socialAccount.updateMany({
      where: { userId: user.id, platform: 'instagram' },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
