import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import { getBrandingFaviconUrl } from '@/lib/config'

// Without this, generateMetadata's DB read gets baked in once at build time
// (same staleness bug we hit with /api/branding) instead of reflecting the
// currently configured favicon.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = await getBrandingFaviconUrl()
  return {
    title: 'Influctor - Plataforma de Crecimiento en Redes Sociales',
    description: 'Gestiona tu crecimiento en redes sociales, mide tus ingresos, maneja campañas y crea contenido con IA.',
    icons: {
      icon: faviconUrl || '/favicon.ico',
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
