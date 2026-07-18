import { NextResponse } from 'next/server'
import { getBrandingLogoUrl } from '@/lib/config'

export const dynamic = 'force-dynamic'

// GET — public, unauthenticated. Used by login/register/landing pages to render the configured logo.
export async function GET() {
  const logoUrl = await getBrandingLogoUrl()
  return NextResponse.json({ logoUrl: logoUrl || null })
}