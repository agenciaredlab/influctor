import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function POST() {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    await prisma.socialAccount.updateMany({
      where: { userId: sessionUser.id, platform: 'tiktok' },
      data:  { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[tiktok disconnect]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
