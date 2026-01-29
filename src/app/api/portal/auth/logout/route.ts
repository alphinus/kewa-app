import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PORTAL_COOKIE_NAME } from '@/lib/portal/session'

/**
 * POST /api/portal/auth/logout
 *
 * Logout tenant from portal
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(PORTAL_COOKIE_NAME)

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Portal logout error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
