import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  validateSessionWithRBAC,
  SESSION_COOKIE_NAME
} from '@/lib/session'
import { isInternalRole } from '@/lib/permissions'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return NextResponse.json({ authenticated: false })
    }

    const session = await validateSessionWithRBAC(sessionCookie.value)

    if (!session) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({
      authenticated: true,
      role: session.role,
      userId: session.userId,
      roleName: session.roleName,
      isInternal: isInternalRole(session.roleName),
      displayName: getDisplayName(session.roleName)
    })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ authenticated: false })
  }
}

function getDisplayName(roleName: string): string {
  switch (roleName) {
    case 'admin':
      return 'KEWA AG'
    case 'property_manager':
      return 'Imeri'
    case 'accounting':
      return 'Buchhaltung'
    case 'tenant':
      return 'Mieter'
    case 'external_contractor':
      return 'Handwerker'
    default:
      return roleName
  }
}
