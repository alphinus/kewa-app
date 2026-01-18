/**
 * Request New Link API
 *
 * POST /api/contractor/request-link
 *
 * Called when contractor with expired/closed token requests a new link.
 * Creates an audit log entry for KEWA to follow up.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RequestBody {
  email: string
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: RequestBody = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create audit log entry for KEWA to see and follow up
    // This uses the generic audit_log table from the schema
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        table_name: 'contractor_link_request',
        action: 'request',
        new_data: {
          email: email.toLowerCase(),
          requested_at: new Date().toISOString(),
          source: 'contractor_portal',
        },
      })

    if (auditError) {
      console.error('Failed to create audit log entry:', auditError)
      // Don't fail the request if audit fails - still accept the request
    }

    // Log the request for server-side tracking
    console.log(`[Contractor Link Request] Email: ${email.toLowerCase()}`)

    return NextResponse.json({
      success: true,
      message: 'Request submitted. KEWA will contact you.',
    })
  } catch (error) {
    console.error('Request link error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
