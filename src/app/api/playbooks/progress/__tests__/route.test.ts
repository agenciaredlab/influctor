import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    playbookProgress: {
      upsert: vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const PROGRESS = {
  id: 'prog_1', userId: 'user_1', playbookId: 'playbook_growth',
  checklistId: 'step_1', completed: true, completedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/playbooks/progress', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(new NextRequest('http://localhost/api/playbooks/progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbookId: 'pb_1', checklistId: 'step_1', completed: true }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when playbookId is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(new NextRequest('http://localhost/api/playbooks/progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklistId: 'step_1', completed: true }),
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when checklistId is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(new NextRequest('http://localhost/api/playbooks/progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbookId: 'pb_1', completed: true }),
    }))
    expect(res.status).toBe(400)
  })

  it('upserts progress and returns the record', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.playbookProgress.upsert).mockResolvedValue(PROGRESS as any)

    const res = await POST(new NextRequest('http://localhost/api/playbooks/progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbookId: 'playbook_growth', checklistId: 'step_1', completed: true }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('prog_1')
    expect(body.completed).toBe(true)
  })

  it('scopes upsert to session userId', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.playbookProgress.upsert).mockResolvedValue(PROGRESS as any)

    await POST(new NextRequest('http://localhost/api/playbooks/progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbookId: 'pb_1', checklistId: 'step_1', completed: false }),
    }))

    expect(prisma.playbookProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userId: 'user_1' }),
        update: expect.objectContaining({ completed: false }),
      })
    )
  })

  it('sets completedAt to null when completed=false', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.playbookProgress.upsert).mockResolvedValue({ ...PROGRESS, completed: false, completedAt: null } as any)

    await POST(new NextRequest('http://localhost/api/playbooks/progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbookId: 'pb_1', checklistId: 'step_1', completed: false }),
    }))

    expect(prisma.playbookProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ completedAt: null }),
        create: expect.objectContaining({ completedAt: null }),
      })
    )
  })
})
