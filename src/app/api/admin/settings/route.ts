import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { dbSet, dbDelete, decryptValue, CONFIG_FIELDS } from '@/lib/config'

async function requireAdmin() {
  const session = await getApiSession()
  if (!session) return null
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { isAdmin: true } })
  return user?.isAdmin ? session : null
}

// GET — returns current values (masked for password fields)
export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const rows = await prisma.systemConfig.findMany()
    const decrypted: Record<string, string> = {}
    for (const row of rows) {
      decrypted[row.key] = decryptValue(row.value)
    }

    // Build response: mask password fields, show text fields
    type Field = { key: string; label: string; placeholder: string; type: string }
    const allFields = (CONFIG_FIELDS as unknown as Array<{ group: string; fields: Field[] }>).flatMap(g => g.fields)
    const result: Record<string, string> = {}
    for (const f of allFields) {
      const val = decrypted[f.key] ?? ''
      result[f.key] = f.type === 'password' && val ? '••••••••' : val
    }

    return NextResponse.json({ settings: result })
  } catch (err) {
    console.error('[admin/settings GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — saves one or more key-value pairs
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body: Record<string, string> = await req.json()

    const validKeys = new Set(CONFIG_FIELDS.flatMap(g => g.fields.map(f => f.key)))

    for (const [key, value] of Object.entries(body)) {
      if (!validKeys.has(key as any)) continue
      if (value === '' || value === '••••••••') {
        // Empty string = delete the entry (fall back to env var)
        await dbDelete(key)
      } else {
        await dbSet(key, value)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/settings POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
