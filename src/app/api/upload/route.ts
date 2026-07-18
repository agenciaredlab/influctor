import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/session'
import { getPresignedPutUrl, getPublicUrl, buildKey, StorageFolder } from '@/lib/storage'

const ALLOWED_FOLDERS: StorageFolder[] = ['avatars', 'documents', 'media', 'brands']

const ALLOWED_MIME: Record<StorageFolder, string[]> = {
  avatars:   ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  media:     ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  brands:    ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'],
}

// 10 MB for images/brands, 50 MB for media, 20 MB for documents
const MAX_BYTES: Record<StorageFolder, number> = {
  avatars:   10 * 1024 * 1024,
  brands:    10 * 1024 * 1024,
  media:     50 * 1024 * 1024,
  documents: 20 * 1024 * 1024,
}

/**
 * POST /api/upload
 * Body: { folder: "avatars" | "media" | "documents" | "brands", filename: "photo.jpg", mime: "image/jpeg", size: 204800 }
 *
 * Returns: { key, uploadUrl, publicUrl }
 *   - uploadUrl: presigned PUT URL → client uploads directly to MinIO
 *   - publicUrl: final public URL of the file once uploaded
 *
 * Flow:
 *   1. Client calls POST /api/upload → gets presigned URL
 *   2. Client PUTs the file to uploadUrl (direct to MinIO, no server involved)
 *   3. Client uses publicUrl as the stored asset URL
 */
export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const { folder, filename, mime, size } = body as {
    folder: StorageFolder
    filename: string
    mime: string
    size: number
  }

  // Validate folder
  if (!ALLOWED_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: `folder debe ser uno de: ${ALLOWED_FOLDERS.join(', ')}` }, { status: 400 })
  }

  // Validate MIME type
  if (!ALLOWED_MIME[folder].includes(mime)) {
    return NextResponse.json({
      error: `Tipo de archivo no permitido en ${folder}. Permitidos: ${ALLOWED_MIME[folder].join(', ')}`,
    }, { status: 400 })
  }

  // Validate size
  if (!size || size > MAX_BYTES[folder]) {
    return NextResponse.json({
      error: `Archivo demasiado grande. Máximo permitido: ${MAX_BYTES[folder] / 1024 / 1024} MB`,
    }, { status: 400 })
  }

  if (!filename?.trim()) {
    return NextResponse.json({ error: 'filename requerido' }, { status: 400 })
  }

  try {
    const key       = buildKey(folder, sessionUser.id, filename)
    const uploadUrl = await getPresignedPutUrl(key, mime)
    const pub       = await getPublicUrl(key)

    return NextResponse.json({ key, uploadUrl, publicUrl: pub })
  } catch (err: any) {
    console.error('[upload POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
