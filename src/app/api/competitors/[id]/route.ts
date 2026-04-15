import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await req.json()

    const competitor = await prisma.competitor.updateMany({
      where: { id: params.id, userId: sessionUser.id },
      data: {
        niche:        body.niche        ?? undefined,
        followers:    body.followers    != null ? Number(body.followers)    : undefined,
        engagement:   body.engagement   != null ? Number(body.engagement)   : undefined,
        avgLikes:     body.avgLikes     != null ? Number(body.avgLikes)     : undefined,
        avgComments:  body.avgComments  != null ? Number(body.avgComments)  : undefined,
        postsPerWeek: body.postsPerWeek != null ? Number(body.postsPerWeek) : undefined,
        contentTypes: body.topFormat    ?? undefined,
        notes:        body.notes        ?? undefined,
      },
    })
    return NextResponse.json({ ok: true, count: competitor.count })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    await prisma.competitor.deleteMany({
      where: { id: params.id, userId: sessionUser.id },
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
