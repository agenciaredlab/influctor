import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    await prisma.competitor.deleteMany({
      where: { id: params.id, userId: user.id },
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
