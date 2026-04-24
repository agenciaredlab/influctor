import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

// GET /api/influencer-discovery?niche=&platform=&tier=&search=&minFollowers=&maxFollowers=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search      = searchParams.get('search') ?? ''
    const niche       = searchParams.get('niche') ?? ''
    const platform    = searchParams.get('platform') ?? ''
    const tier        = searchParams.get('tier') ?? ''
    const minFollowers = Number(searchParams.get('minFollowers') ?? 0)
    const maxFollowers = Number(searchParams.get('maxFollowers') ?? 0)

    const where: any = {}

    if (niche && niche !== 'Todos') where.niche = niche
    if (platform && platform !== 'Todas') where.platform = platform
    if (minFollowers > 0) where.followers = { ...where.followers, gte: minFollowers }
    if (maxFollowers > 0) where.followers = { ...where.followers, lte: maxFollowers }

    // Tier filter maps to follower ranges
    if (tier && tier !== 'Todos') {
      if (tier.includes('Nano'))  where.followers = { gte: 0, lte: 9999 }
      if (tier.includes('Micro')) where.followers = { gte: 10000, lte: 99999 }
      if (tier.includes('Macro')) where.followers = { gte: 100000, lte: 999999 }
      if (tier.includes('Mega'))  where.followers = { gte: 1000000 }
    }

    if (search) {
      where.OR = [
        { name:   { contains: search, mode: 'insensitive' } },
        { handle: { contains: search, mode: 'insensitive' } },
        { niche:  { contains: search, mode: 'insensitive' } },
        { topics: { contains: search, mode: 'insensitive' } },
      ]
    }

    const profiles = await prisma.influencerProfile.findMany({
      where,
      orderBy: [{ verified: 'desc' }, { followers: 'desc' }],
      take:    200,
    })

    return NextResponse.json({ profiles, total: profiles.length })
  } catch (err) {
    console.error('[influencer-discovery GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/influencer-discovery — Pro users add new profiles
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
    if (!user || user.plan !== 'pro') {
      return NextResponse.json({ error: 'Agregar influencers requiere plan Pro' }, { status: 403 })
    }

    const body = await req.json()
    const { name, handle, platform, niche, followers, engagement, avgViews,
      estimatedRate, location, bio, topics, verified, profileUrl } = body

    if (!name?.trim() || !handle?.trim() || !platform) {
      return NextResponse.json({ error: 'name, handle y platform son obligatorios' }, { status: 400 })
    }

    try {
      const profile = await prisma.influencerProfile.create({
        data: {
          name:          name.trim(),
          handle:        handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`,
          platform,
          niche:         niche || null,
          followers:     Number(followers) || 0,
          engagement:    Number(engagement) || 0,
          avgViews:      Number(avgViews) || 0,
          estimatedRate: Number(estimatedRate) || 0,
          location:      location || null,
          bio:           bio || null,
          topics:        topics || null,
          verified:      Boolean(verified),
          profileUrl:    profileUrl || null,
          addedById:     sessionUser.id,
        },
      })
      return NextResponse.json({ profile }, { status: 201 })
    } catch (err: any) {
      if (err.code === 'P2002') {
        return NextResponse.json({ error: 'Este handle ya existe en esa plataforma' }, { status: 409 })
      }
      throw err
    }
  } catch (err) {
    console.error('[influencer-discovery POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
