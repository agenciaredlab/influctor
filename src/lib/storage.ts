import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// MinIO / S3-compatible storage client
// Works with MinIO (local), AWS S3, Supabase Storage, etc.
// Configure via STORAGE_* env vars in .env.local

function getClient() {
  const endpoint = process.env.STORAGE_ENDPOINT
  const region   = process.env.STORAGE_REGION ?? 'us-east-1'
  if (!endpoint || !process.env.STORAGE_ACCESS_KEY || !process.env.STORAGE_SECRET_KEY) {
    throw new Error('Storage no configurado. Agrega STORAGE_ENDPOINT, STORAGE_ACCESS_KEY y STORAGE_SECRET_KEY en .env.local')
  }
  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId:     process.env.STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.STORAGE_SECRET_KEY,
    },
    forcePathStyle: true, // required for MinIO
  })
}

export type StorageFolder = 'avatars' | 'documents' | 'media' | 'brands'

/**
 * Generates a presigned PUT URL so the browser uploads directly to MinIO.
 * The file never passes through the Next.js server.
 *
 * @param key    Object key inside the bucket, e.g. "avatars/user_123.jpg"
 * @param mime   MIME type of the file, e.g. "image/jpeg"
 * @param ttl    Seconds the URL is valid (default: 5 minutes)
 */
export async function getPresignedPutUrl(key: string, mime: string, ttl = 300) {
  const client = getClient()
  const command = new PutObjectCommand({
    Bucket:      process.env.STORAGE_BUCKET ?? 'influctor',
    Key:         key,
    ContentType: mime,
  })
  const url = await getSignedUrl(client, command, { expiresIn: ttl })
  return url
}

/**
 * Returns the public URL of a stored object.
 * Assumes the bucket or the object has public read access.
 */
export function getPublicUrl(key: string): string {
  const pubUrl  = process.env.STORAGE_PUBLIC_URL
  const ep      = process.env.STORAGE_ENDPOINT
  const bkt     = process.env.STORAGE_BUCKET ?? 'influctor'
  const base    = (pubUrl ?? `${ep}/${bkt}`).replace(/\/$/, '')
  return `${base}/${key}`
}

/**
 * Deletes an object from the bucket.
 */
export async function deleteObject(key: string) {
  const client = getClient()
  await client.send(new DeleteObjectCommand({ Bucket: process.env.STORAGE_BUCKET ?? 'influctor', Key: key }))
}

/**
 * Builds a storage key from folder + userId + original filename.
 * Replaces spaces and keeps the extension.
 * Example: "avatars/usr_abc123_1713200000000.jpg"
 */
export function buildKey(folder: StorageFolder, userId: string, filename: string): string {
  const dotIdx = filename.lastIndexOf('.')
  const ext    = dotIdx > 0 ? filename.slice(dotIdx + 1).toLowerCase() : 'bin'
  const ts     = Date.now()
  return `${folder}/${userId}_${ts}.${ext}`
}
