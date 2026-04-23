import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

async function ownedContract(id: string, userId: string) {
  return prisma.contract.findFirst({ where: { id, userId } })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const contract = await ownedContract(params.id, sessionUser.id)
    if (!contract) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    return NextResponse.json(contract)
  } catch (err) {
    console.error('[contracts/[id] GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const existing = await ownedContract(params.id, sessionUser.id)
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await prisma.contract.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[contracts/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
