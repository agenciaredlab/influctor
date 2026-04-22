import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed_password') },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create:     vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

const CREATED_USER = { id: 'user_1', email: 'test@example.com', name: 'Test User' }

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/register', () => {
  it('returns 400 when name is missing', async () => {
    const res = await POST(makeReq({ email: 'test@example.com', password: 'password123' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeReq({ name: 'Test', password: 'password123' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeReq({ name: 'Test', email: 'test@example.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is too short', async () => {
    const res = await POST(makeReq({ name: 'Test', email: 'test@example.com', password: 'short' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/8 caracteres/)
  })

  it('returns 409 when email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(CREATED_USER as any)

    const res = await POST(makeReq({ name: 'Test', email: 'test@example.com', password: 'password123' }))
    expect(res.status).toBe(409)
  })

  it('creates user and returns 201', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(CREATED_USER as any)

    const res = await POST(makeReq({ name: 'Test User', email: 'test@example.com', password: 'password123' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('user_1')
    expect(body.email).toBe('test@example.com')
  })

  it('normalizes email to lowercase', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(CREATED_USER as any)

    await POST(makeReq({ name: 'Test', email: 'TEST@EXAMPLE.COM', password: 'password123' }))

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'test@example.com' }) })
    )
  })

  it('hashes the password before storing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue(CREATED_USER as any)

    await POST(makeReq({ name: 'Test', email: 'test@example.com', password: 'mypassword' }))

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: 'hashed_password' }) })
    )
  })
})
