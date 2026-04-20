import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXTAUTH_URL ?? 'https://influctor.app'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register'],
        disallow: [
          '/api/',
          '/dashboard/',
          '/goals/',
          '/campaigns/',
          '/analytics/',
          '/calendar/',
          '/deals/',
          '/marketplace/',
          '/monetization/',
          '/ai-studio/',
          '/scripts/',
          '/repurpose/',
          '/hashtags/',
          '/ab-test/',
          '/competitors/',
          '/influencer-discovery/',
          '/playbooks/',
          '/reports/',
          '/settings/',
          '/pricing/',
          '/business/',
          '/contracts/',
          '/outreach/',
          '/viral-lab/',
          '/niche-finder/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
