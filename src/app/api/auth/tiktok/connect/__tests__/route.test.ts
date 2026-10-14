import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { OWNER_PERMS, memberSession } from '@/test-utils/team'
import { GET } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/config', () => ({
  getTikTokClientKey: vi.fn().mockResolvedValue('ck'),
  getAppUrl:          vi.fn().mockResolvedValue('http://localhost:3000'),
}))

import { getApiSession } from '@/lib/session'

const req = () => new NextRequest('http://localhost:3000/api/auth/tiktok/connect')
const location = (res: Response) => decodeURIComponent(res.headers.get('location') ?? '')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/auth/tiktok/connect', () => {
  it('no session -> back to /settings with not_authenticated, never to TikTok', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(req())
    expect(location(res)).toBe('http://localhost:3000/settings?tiktok_error=not_authenticated')
  })

  it('member without canConnectSocialAccounts -> back to /settings with a permission error', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
    const res = await GET(req())
    expect(location(res)).toContain('/settings?tiktok_error=No tienes permiso')
    expect(location(res)).not.toContain('tiktok.com/v2/auth')
  })

  it('member with the flag is sent to the TikTok consent screen', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canConnectSocialAccounts: true }) as any)
    const res = await GET(req())
    expect(location(res)).toContain('tiktok.com/v2/auth/authorize')
  })

  it('owner is sent to the TikTok consent screen', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ id: 'u', accountId: 'u', permissions: OWNER_PERMS } as any)
    const res = await GET(req())
    expect(location(res)).toContain('tiktok.com/v2/auth/authorize')
  })
})
