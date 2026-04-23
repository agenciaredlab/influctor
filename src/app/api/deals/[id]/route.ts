import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { sendDealStageNotification } from '@/lib/email'

async function ownedDeal(id: string, userId: string) {
  return prisma.brandDeal.findFirst({ where: { id, userId } })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const existing = await ownedDeal(params.id, sessionUser.id)
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const data = await req.json()
    const { brand, contact, email, phone, platform, type, stage, value,
      commissionPct, dueDate, description, deliverables, notes, tags, niche } = data

    const deal = await prisma.brandDeal.update({
      where: { id: params.id },
      data: {
        brand, contact: contact || null, email: email || null, phone: phone || null,
        platform, type, stage, value: parseFloat(value || 0),
        commissionPct: commissionPct ? parseFloat(commissionPct) : null,
        dueDate: dueDate ? new Date(dueDate) : null, description: description || null,
        deliverables: deliverables || null, notes: notes || null,
        tags: tags || null, niche: niche || null,
      },
    })

    // Non-blocking stage change notification
    if (stage && existing.stage !== stage && sessionUser.email) {
      sendDealStageNotification({
        userName:  sessionUser.name ?? 'Creador',
        userEmail: sessionUser.email,
        brand:     deal.brand,
        oldStage:  existing.stage,
        newStage:  stage,
        value:     deal.value,
        currency:  deal.currency,
      })?.catch(() => {})
    }

    return NextResponse.json(deal)
  } catch (err) {
    console.error('[deals/[id] PUT]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const existing = await ownedDeal(params.id, sessionUser.id)
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const rawData = await req.json()
    const { userId: _uid, id: _id, ...data } = rawData
    const deal = await prisma.brandDeal.update({ where: { id: params.id }, data })

    // Non-blocking stage change notification (for quick Kanban drag-and-drop patches)
    if (data.stage && existing.stage !== data.stage && sessionUser.email) {
      sendDealStageNotification({
        userName:  sessionUser.name ?? 'Creador',
        userEmail: sessionUser.email,
        brand:     deal.brand,
        oldStage:  existing.stage,
        newStage:  data.stage,
        value:     deal.value,
        currency:  deal.currency,
      })?.catch(() => {})
    }

    return NextResponse.json(deal)
  } catch (err) {
    console.error('[deals/[id] PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const existing = await ownedDeal(params.id, sessionUser.id)
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await prisma.brandDeal.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[deals/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
