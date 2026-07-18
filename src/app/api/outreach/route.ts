import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const entries = await prisma.outreachEntry.findMany({
      where:   { userId: sessionUser.id },
      orderBy: { sentAt: 'desc' },
      take:    200,
    })
    return NextResponse.json(entries)
  } catch (err) {
    console.error('[outreach GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const data = await req.json()
    const { brand, contact, template, notes } = data

    if (!brand?.trim()) return NextResponse.json({ error: 'brand required' }, { status: 400 })

    const entry = await prisma.outreachEntry.create({
      data: {
        userId: sessionUser.id,
        brand:  brand.trim(),
        contact: contact || null,
        template: template || null,
        notes:   notes || null,
      },
    })
    return NextResponse.json(entry, { status: 201 })
  } catch (err) {
    console.error('[outreach POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}