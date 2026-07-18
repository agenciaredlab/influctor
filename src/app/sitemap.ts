import { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (await getAppUrl()) || 'https://influctor.agenciaredlab.com'

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${base}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${base}/register`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
  ]
}
