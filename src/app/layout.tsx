import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'

export const metadata: Metadata = {
  title: 'Influctor - Plataforma de Crecimiento en Redes Sociales',
  description: 'Gestiona tu crecimiento en redes sociales, mide tus ingresos, maneja campañas y crea contenido con IA.',
  icons: {
    icon: '/favicon.ico',
  },
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
