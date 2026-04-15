/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  images: {
    remotePatterns: [
      // Auth providers
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },      // Google OAuth avatars
      // Stock / placeholder
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Cloudinary (user-uploaded media)
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // AWS S3 — covers any bucket/region (*.amazonaws.com)
      { protocol: 'https', hostname: '*.amazonaws.com' },
      // Supabase Storage
      { protocol: 'https', hostname: '*.supabase.co' },
      // Instagram CDN (for synced media)
      { protocol: 'https', hostname: '*.cdninstagram.com' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
    ],
  },
}

module.exports = nextConfig
