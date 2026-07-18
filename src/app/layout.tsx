import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import { getBrandingFaviconUrl, getBrandingLogoUrl, getAppUrl } from '@/lib/config'

// Without this, generateMetadata's DB read gets baked in once at build time
// (same staleness bug we hit with /api/branding) instead of reflecting the
// currently configured favicon/app URL.
export const dynamic = 'force-dynamic'

const TITLE = 'Influctor - Plataforma de Crecimiento en Redes Sociales'
const DESCRIPTION = 'Gestiona tu crecimiento en redes sociales, mide tus ingresos, maneja campañas y crea contenido con IA. Todo en un solo lugar.'

export async function generateMetadata(): Promise<Metadata> {
  const [faviconUrl, logoUrl, appUrl] = await Promise.all([
    getBrandingFaviconUrl(),
    getBrandingLogoUrl(),
    getAppUrl(),
  ])
  const base = appUrl || 'https://influctor.agenciaredlab.com'

  return {
    metadataBase: new URL(base),
    title: TITLE,
    description: DESCRIPTION,
    keywords: [
      'crecimiento en redes sociales', 'gestión de creadores de contenido', 'marketing de influencers',
      'analytics de Instagram', 'analytics de TikTok', 'brand deals', 'plataforma para creadores',
      'contenido con inteligencia artificial', 'Influctor',
    ],
    authors: [{ name: 'Juan Camilo Medina Godoy' }, { name: 'Agencia RedLab', url: 'https://agenciaredlab.com' }],
    creator: 'Agencia RedLab',
    publisher: 'Agencia RedLab',
    robots: { index: true, follow: true },
    alternates: { canonical: base },
    icons: {
      icon: faviconUrl || '/favicon.ico',
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: base,
      siteName: 'Influctor',
      locale: 'es_CO',
      type: 'website',
      images: logoUrl ? [{ url: logoUrl }] : undefined,
    },
    twitter: {
      card: 'summary',
      title: TITLE,
      description: DESCRIPTION,
      images: logoUrl ? [logoUrl] : undefined,
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-[#07070f] text-white antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
