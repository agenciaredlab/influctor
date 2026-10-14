import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { OWNER_PERMS, memberSession } from '@/test-utils/team'
import { GET } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

import { getApiSession } from '@/lib/session'

const req = () => new NextRequest('http://localhost:3000/api/auth/instagram/connect')
const location = (res: Response) => decodeURIComponent(res.headers.get('location') ?? '')

beforeEach(() => {
  vi.clearAllMocks()
  process.env.INSTAGRAM_APP_ID = 'app-id'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
})
afterEach(() => {
  delete process.env.INSTAGRAM_APP_ID
  delete process.env.NEXT_PUBLIC_APP_URL
})

describe('GET /api/auth/instagram/connect', () => {
  it('no session -> back to /settings with not_authenticated, never to Facebook', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(req())
    expect(location(res)).toBe('http://localhost:3000/settings?instagram_error=not_authenticated')
  })

  it('member without canConnectSocialAccounts -> back to /settings with a permission error', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
    const res = await GET(req())
    expect(location(res)).toContain('/settings?instagram_error=No tienes permiso')
    expect(location(res)).not.toContain('facebook.com')
  })

  it('member with the flag is sent to the Facebook consent screen', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canConnectSocialAccounts: true }) as any)
    const res = await GET(req())
    expect(location(res)).toContain('facebook.com')
  })

  it('owner is sent to the Facebook consent screen', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ id: 'u', accountId: 'u', permissions: OWNER_PERMS } as any)
    const res = await GET(req())
    expect(location(res)).toContain('facebook.com')
  })
})
