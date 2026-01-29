import { NextRequest, NextResponse } from 'next/server'
import { getPortalUser } from '@/lib/portal/session'

/**
 * GET /api/portal/auth/session
 *
 * Check portal session status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getPortalUser()

    if (!user) {
      return NextResponse.json({
        authenticated: false
      })
    }

    return NextResponse.json({
      authenticated: true,
      userId: user.id
    })
  } catch (error) {
    console.error('Portal session check error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}
