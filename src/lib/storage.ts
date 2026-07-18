import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getStorageEndpoint, getStorageAccessKey, getStorageSecretKey, getStorageBucket, getStoragePublicUrl, getStorageRegion } from '@/lib/config'

// MinIO / S3-compatible storage client
// Works with MinIO (local), AWS S3, Supabase Storage, etc.
// Configured via SystemConfig (DB-first, /admin/settings), STORAGE_* env vars as fallback.

async function getClient() {
  const [endpoint, accessKey, secretKey, region] = await Promise.all([
    getStorageEndpoint(),
    getStorageAccessKey(),
    getStorageSecretKey(),
    getStorageRegion(),
  ])
  if (!endpoint || !accessKey || !secretKey) {
    throw new Error('Storage no configurado. Configura Storage (S3/MinIO) en /admin/settings o STORAGE_* en .env.local')
  }
  return new S3Client({
    endpoint,
    region: region || 'us-east-1',
    credentials: {
      accessKeyId:     accessKey,
      secretAccessKey: secretKey,
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
  const client = await getClient()
  const bucket = (await getStorageBucket()) || 'influctor'
  const command = new PutObjectCommand({
    Bucket:      bucket,
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
export async function getPublicUrl(key: string): Promise<string> {
  const [pubUrl, ep, bkt] = await Promise.all([getStoragePublicUrl(), getStorageEndpoint(), getStorageBucket()])
  const bucket = bkt || 'influctor'
  const base   = (pubUrl || `${ep}/${bucket}`).replace(/\/$/, '')
  return `${base}/${key}`
}

/**
 * Deletes an object from the bucket.
 */
export async function deleteObject(key: string) {
  const client = await getClient()
  const bucket = (await getStorageBucket()) || 'influctor'
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
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
