import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

function esc(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function toCsv(headers: string[], rows: string[][]): string {
  // BOM for Excel UTF-8 compatibility
  return '﻿' + [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
}

function date(d: Date | null | undefined) {
  return d ? d.toISOString().split('T')[0] : ''
}

export async function GET(req: NextRequest) {
  try {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type')

  if (type === 'income') {
    const rows = await prisma.income.findMany({
      where:   { userId: sessionUser.id },
      orderBy: { date: 'desc' },
    })

    const headers = ['Fecha', 'Fuente', 'Plataforma', 'Descripción', 'Monto', 'Moneda', 'Facturado', 'Pagado']
    const data    = rows.map(r => [
      date(r.date), r.source, r.platform ?? '', r.description ?? '',
      String(r.amount), r.currency,
      r.invoiced ? 'Sí' : 'No', r.paid ? 'Sí' : 'No',
    ])

    return csvResponse(toCsv(headers, data), `ingresos-${date(new Date())}.csv`)
  }

  if (type === 'deals') {
    const rows = await prisma.brandDeal.findMany({
      where:   { userId: sessionUser.id },
      orderBy: { createdAt: 'desc' },
    })

    const headers = ['Marca', 'Contacto', 'Email', 'Teléfono', 'Plataforma', 'Tipo', 'Etapa',
                     'Valor', 'Moneda', 'Comisión_%', 'Vencimiento', 'Nicho', 'Descripción',
                     'Entregables', 'Notas', 'Tags', 'Creado']
    const data = rows.map(r => [
      r.brand, r.contact ?? '', r.email ?? '', r.phone ?? '',
      r.platform, r.type, r.stage,
      String(r.value), r.currency, r.commissionPct != null ? String(r.commissionPct) : '',
      date(r.dueDate), r.niche ?? '', r.description ?? '',
      r.deliverables ?? '', r.notes ?? '', r.tags ?? '',
      date(r.createdAt),
    ])

    return csvResponse(toCsv(headers, data), `brand-deals-${date(new Date())}.csv`)
  }

  if (type === 'campaigns') {
    const rows = await prisma.campaign.findMany({
      where:   { userId: sessionUser.id },
      orderBy: { createdAt: 'desc' },
    })

    const headers = ['Nombre', 'Objetivo', 'Plataforma', 'Estado', 'Presupuesto', 'Gastado',
                     'ROI_%', 'Impresiones', 'Alcance', 'Engagement', 'Conversiones', 'Clics',
                     'Inicio', 'Fin', 'Tags', 'Creado']
    const data = rows.map(r => {
      const roi = r.budget > 0 ? (((r.spent - r.budget) / r.budget) * 100).toFixed(1) : ''
      return [
        r.name, r.objective, r.platform, r.status,
        String(r.budget), String(r.spent), roi,
        String(r.impressions), String(r.reach), String(r.engagement),
        String(r.conversions), String(r.clicks),
        date(r.startDate), date(r.endDate ?? null), r.tags ?? '',
        date(r.createdAt),
      ]
    })

    return csvResponse(toCsv(headers, data), `campanas-${date(new Date())}.csv`)
  }

  return NextResponse.json({ error: 'El parámetro type debe ser: income, deals o campaigns' }, { status: 400 })
  } catch (err) {
    console.error('[export GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  })
}
