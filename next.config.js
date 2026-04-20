/** @type {import('next').NextConfig} */

// MinIO / custom storage hostname (set STORAGE_ENDPOINT in .env.local)
// e.g. "http://localhost:9000" → hostname "localhost"
//      "https://storage.mydomain.com" → hostname "storage.mydomain.com"
function storageHostname() {
  try {
    const ep = process.env.STORAGE_ENDPOINT
    if (!ep) return null
    return new URL(ep).hostname
  } catch {
    return null
  }
}

const storageHost = storageHostname()

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      // Auth providers
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Stock / placeholder
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Supabase Storage
      { protocol: 'https', hostname: '*.supabase.co' },
      // Instagram CDN (synced media)
      { protocol: 'https', hostname: '*.cdninstagram.com' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
      // MinIO / custom storage (reads STORAGE_ENDPOINT from env)
      ...(storageHost ? [{ protocol: storageHost === 'localhost' ? 'http' : 'https', hostname: storageHost }] : []),
    ],
  },
}

module.exports = nextConfig
