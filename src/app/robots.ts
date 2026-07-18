import { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/config'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = (await getAppUrl()) || 'https://influctor.agenciaredlab.com'
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
