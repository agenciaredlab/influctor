import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

vi.mock('@/lib/session', () => ({
  getApiSession: vi.fn(),
}))

vi.mock('@/lib/storage', () => ({
  buildKey: vi.fn().mockReturnValue('avatars/user_1_1737000000000.jpg'),
  getPresignedPutUrl: vi.fn().mockResolvedValue('https://minio.example.com/presigned-url'),
  getPublicUrl: vi.fn().mockResolvedValue('https://cdn.example.com/avatars/user_1_1737000000000.jpg'),
}))

import { getApiSession } from '@/lib/session'
import { buildKey, getPresignedPutUrl, getPublicUrl } from '@/lib/storage'

const mockSession = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }

const MOCK_KEY       = 'avatars/user_1_1737000000000.jpg'
const MOCK_UPLOAD    = 'https://minio.example.com/presigned-url'
const MOCK_PUBLIC    = 'https://cdn.example.com/avatars/user_1_1737000000000.jpg'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(buildKey).mockReturnValue(MOCK_KEY)
  vi.mocked(getPresignedPutUrl).mockResolvedValue(MOCK_UPLOAD)
  vi.mocked(getPublicUrl).mockResolvedValue(MOCK_PUBLIC)
})

describe('POST /api/upload', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeRequest({ folder: 'avatars', filename: 'photo.jpg', mime: 'image/jpeg', size: 1024 }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid folder', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const res = await POST(makeRequest({ folder: 'secrets', filename: 'photo.jpg', mime: 'image/jpeg', size: 1024 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('folder')
  })

  it('returns 400 for a disallowed MIME type', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const res = await POST(makeRequest({ folder: 'avatars', filename: 'script.js', mime: 'application/javascript', size: 1024 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('no permitido')
  })

  it('returns 400 when size exceeds folder limit', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const overLimit = 11 * 1024 * 1024 // 11 MB — avatars max is 10 MB
    const res = await POST(makeRequest({ folder: 'avatars', filename: 'big.jpg', mime: 'image/jpeg', size: overLimit }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('grande')
  })

  it('returns 400 when filename is empty', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const res = await POST(makeRequest({ folder: 'avatars', filename: '   ', mime: 'image/jpeg', size: 1024 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('filename')
  })

  it('returns 400 when size is 0', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const res = await POST(makeRequest({ folder: 'avatars', filename: 'photo.jpg', mime: 'image/jpeg', size: 0 }))
    expect(res.status).toBe(400)
  })

  it('returns key, uploadUrl, publicUrl on success', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)

    const res = await POST(makeRequest({ folder: 'avatars', filename: 'photo.jpg', mime: 'image/jpeg', size: 1024 }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.key).toBe(MOCK_KEY)
    expect(body.uploadUrl).toBe(MOCK_UPLOAD)
    expect(body.publicUrl).toBe(MOCK_PUBLIC)
  })

  it('calls buildKey with folder, userId, and filename', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)

    await POST(makeRequest({ folder: 'media', filename: 'video.mp4', mime: 'video/mp4', size: 1024 * 1024 }))

    expect(buildKey).toHaveBeenCalledWith('media', 'user_1', 'video.mp4')
  })

  it('calls getPresignedPutUrl with key and MIME type', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)

    await POST(makeRequest({ folder: 'documents', filename: 'contract.pdf', mime: 'application/pdf', size: 1024 }))

    expect(getPresignedPutUrl).toHaveBeenCalledWith(MOCK_KEY, 'application/pdf')
  })

  it('accepts SVG files for brands folder', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)

    const res = await POST(makeRequest({ folder: 'brands', filename: 'logo.svg', mime: 'image/svg+xml', size: 2048 }))
    expect(res.status).toBe(200)
  })

  it('rejects video in avatars folder', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)

    const res = await POST(makeRequest({ folder: 'avatars', filename: 'video.mp4', mime: 'video/mp4', size: 1024 }))
    expect(res.status).toBe(400)
  })

  it('returns 500 when storage throws', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(getPresignedPutUrl).mockRejectedValue(new Error('MinIO unreachable'))

    const res = await POST(makeRequest({ folder: 'avatars', filename: 'photo.jpg', mime: 'image/jpeg', size: 1024 }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
  })

  it('allows media files up to 50 MB', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)

    const res = await POST(makeRequest({ folder: 'media', filename: 'clip.mp4', mime: 'video/mp4', size: 49 * 1024 * 1024 }))
    expect(res.status).toBe(200)
  })

  it('rejects media files over 50 MB', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)

    const res = await POST(makeRequest({ folder: 'media', filename: 'huge.mp4', mime: 'video/mp4', size: 51 * 1024 * 1024 }))
    expect(res.status).toBe(400)
  })
})
