import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

async function ownedEntry(id: string, userId: string) {
  return prisma.outreachEntry.findFirst({ where: { id, userId } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const existing = await ownedEntry(params.id, sessionUser.id)
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const data = await req.json()
    const { status, notes, contact, brand } = data
    const update: Record<string, any> = {}
    if (status !== undefined)  update.status  = status
    if (notes !== undefined)   update.notes   = notes
    if (contact !== undefined) update.contact = contact
    if (brand !== undefined)   update.brand   = brand

    const entry = await prisma.outreachEntry.update({ where: { id: params.id }, data: update })
    return NextResponse.json(entry)
  } catch (err) {
    console.error('[outreach/[id] PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const existing = await ownedEntry(params.id, sessionUser.id)
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await prisma.outreachEntry.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[outreach/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}