/**
 * Send Inspection Portal Link API
 *
 * POST: Creates magic link token and returns portal URL for contractor sharing
 * Requires authentication - internal API for logged-in users.
 *
 * Phase: 23-inspection-advanced Plan 02
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME, validateSession } from '@/lib/session'
import { createInspectionPortalToken } from '@/lib/inspections/portal-tokens'

interface SendPortalBody {
  email: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Auth check
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const session = await validateSession(sessionCookie.value)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SendPortalBody = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const token = await createInspectionPortalToken(id, email)
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/inspections/${token}`

    // Note: Email sending would be integrated here in Phase 24
    // For now, return the URL for manual sharing

    return NextResponse.json({ portalUrl, token })
  } catch (error) {
    console.error('Error creating inspection portal token:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
