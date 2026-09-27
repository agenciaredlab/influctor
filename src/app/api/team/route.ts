import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { getPlan } from '@/lib/plans'
import { sendTeamInviteEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/config'

const PERMISSION_KEYS = [
  'canManageContent', 'canManageDeals', 'canManageCompetitors',
  'canConnectSocialAccounts', 'canUseAI', 'canViewIncome',
] as const

function pickPermissions(body: any) {
  const out: Record<string, boolean> = {}
  for (const key of PERMISSION_KEYS) out[key] = body?.[key] === true
  return out
}

// Only the account owner manages their team — a team member has accountId
// pointing at someone else, never at their own id.
async function requireOwner() {
  const session = await getApiSession()
  if (!session) return null
  if (session.accountId !== session.id) return null
  return session
}

// GET /api/team — list this owner's team (pending + active), for the "Mi Equipo" settings section.
export async function GET() {
  try {
    const owner = await requireOwner()
    if (!owner) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const members = await prisma.teamMembership.findMany({
      where:   { ownerId: owner.id },
      orderBy: { invitedAt: 'asc' },
      include: { member: { select: { name: true, email: true } } },
    })
    return NextResponse.json(members)
  } catch (err) {
    console.error('[team GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/team — invite a new team member by email. Body: { email, ...6 permission booleans }.
export async function POST(req: NextRequest) {
  try {
    const owner = await requireOwner()
    if (!owner) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json()
    const email = (body?.email ?? '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const ownerUser = await prisma.user.findUnique({ where: { id: owner.id } })
    if (!ownerUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const limit = getPlan(ownerUser.plan).limits.teamMembers
    if (limit <= 0) {
      return NextResponse.json({ error: 'Tu plan no incluye equipos. Actualiza a Pro para invitar usuarios.' }, { status: 403 })
    }

    const currentCount = await prisma.teamMembership.count({
      where: { ownerId: owner.id, status: { in: ['pending', 'active'] } },
    })
    if (currentCount >= limit) {
      return NextResponse.json({ error: `Tu plan permite hasta ${limit} usuarios de equipo.` }, { status: 403 })
    }

    if (email === ownerUser.email.toLowerCase()) {
      return NextResponse.json({ error: 'No puedes invitarte a ti mismo' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Ese correo ya tiene una cuenta de Influctor — no se puede unir a un equipo todavía.' },
        { status: 409 }
      )
    }

    const existingInvite = await prisma.teamMembership.findUnique({
      where: { ownerId_invitedEmail: { ownerId: owner.id, invitedEmail: email } },
    })
    if (existingInvite) {
      return NextResponse.json({ error: 'Ya invitaste a este correo' }, { status: 409 })
    }

    const membership = await prisma.teamMembership.create({
      data: { ownerId: owner.id, invitedEmail: email, ...pickPermissions(body) },
    })

    const base = (await getAppUrl()) ?? 'http://localhost:3000'
    sendTeamInviteEmail({
      invitedEmail: email,
      ownerName:    ownerUser.name,
      acceptUrl:    `${base}/team/accept/${membership.id}`,
    }).catch(err => console.error('[team invite email]', err))

    return NextResponse.json(membership, { status: 201 })
  } catch (err) {
    console.error('[team POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
