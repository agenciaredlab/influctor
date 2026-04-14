import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const body = await req.json()
    const competitor = await prisma.competitor.create({
      data: {
        userId:       user.id,
        name:         body.handle.replace('@', ''),
        handle:       body.handle.startsWith('@') ? body.handle : `@${body.handle}`,
        platform:     body.platform,
        niche:        body.niche || null,
        followers:    body.followers ?? 0,
        engagement:   body.engagement ?? 0,
        avgLikes:     body.avgLikes ?? 0,
        avgComments:  body.avgComments ?? 0,
        postsPerWeek: body.postsPerWeek ?? 0,
        contentTypes: body.topFormat ?? null,
        notes:        body.notes || null,
      },
    })
    return NextResponse.json({ competitor })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
