import { NextResponse } from 'next/server'
import { getBrandingLogoUrl, getBrandingFaviconUrl } from '@/lib/config'

export const dynamic = 'force-dynamic'

// GET — public, unauthenticated. Used by login/register/landing pages to render the configured logo.
export async function GET() {
  const [logoUrl, faviconUrl] = await Promise.all([getBrandingLogoUrl(), getBrandingFaviconUrl()])
  return NextResponse.json({ logoUrl: logoUrl || null, faviconUrl: faviconUrl || null })
}
