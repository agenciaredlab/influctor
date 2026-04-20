import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildKey, getPublicUrl } from '../storage'

describe('buildKey', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds a key with the correct format', () => {
    const key = buildKey('avatars', 'user123', 'photo.jpg')
    expect(key).toBe(`avatars/user123_${Date.now()}.jpg`)
  })

  it('lowercases the extension', () => {
    const key = buildKey('media', 'u1', 'Video.MP4')
    expect(key).toMatch(/\.mp4$/)
  })

  it('uses the correct folder prefix', () => {
    expect(buildKey('avatars',   'u1', 'a.png')).toMatch(/^avatars\//)
    expect(buildKey('documents', 'u1', 'a.pdf')).toMatch(/^documents\//)
    expect(buildKey('media',     'u1', 'a.mp4')).toMatch(/^media\//)
    expect(buildKey('brands',    'u1', 'a.svg')).toMatch(/^brands\//)
  })

  it('falls back to "bin" for files without extension', () => {
    const key = buildKey('documents', 'u1', 'noextension')
    expect(key).toMatch(/\.bin$/)
  })

  it('includes the userId', () => {
    const key = buildKey('avatars', 'abc_xyz_123', 'img.webp')
    expect(key).toContain('abc_xyz_123')
  })

  it('uses the last segment as extension for dotted filenames', () => {
    const key = buildKey('media', 'u1', 'my.video.file.mp4')
    expect(key).toMatch(/\.mp4$/)
  })
})

describe('getPublicUrl', () => {
  const ORIGINAL_ENV = { ...process.env }

  afterEach(() => {
    process.env.STORAGE_PUBLIC_URL = ORIGINAL_ENV.STORAGE_PUBLIC_URL
    process.env.STORAGE_ENDPOINT   = ORIGINAL_ENV.STORAGE_ENDPOINT
    process.env.STORAGE_BUCKET     = ORIGINAL_ENV.STORAGE_BUCKET
  })

  it('uses STORAGE_PUBLIC_URL when set', () => {
    process.env.STORAGE_PUBLIC_URL = 'https://cdn.example.com/files'
    const url = getPublicUrl('avatars/user_123.jpg')
    expect(url).toBe('https://cdn.example.com/files/avatars/user_123.jpg')
  })

  it('strips trailing slash from STORAGE_PUBLIC_URL', () => {
    process.env.STORAGE_PUBLIC_URL = 'https://cdn.example.com/files/'
    expect(getPublicUrl('foo.jpg')).toBe('https://cdn.example.com/files/foo.jpg')
  })

  it('falls back to endpoint + bucket when STORAGE_PUBLIC_URL is not set', () => {
    delete process.env.STORAGE_PUBLIC_URL
    process.env.STORAGE_ENDPOINT = 'http://localhost:9000'
    process.env.STORAGE_BUCKET   = 'influctor'
    const url = getPublicUrl('avatars/user_123.jpg')
    expect(url).toBe('http://localhost:9000/influctor/avatars/user_123.jpg')
  })

  it('handles nested keys correctly', () => {
    process.env.STORAGE_PUBLIC_URL = 'https://cdn.example.com'
    expect(getPublicUrl('a/b/c.pdf')).toBe('https://cdn.example.com/a/b/c.pdf')
  })
})
