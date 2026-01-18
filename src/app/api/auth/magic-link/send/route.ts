import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getSessionFromRequest } from '@/lib/auth'
import { createAuthAuditLog } from '@/lib/audit'

/**
 * POST /api/auth/magic-link/send
 *
 * Generate a magic link token for contractor portal access.
 * Only admin and property_manager can send magic links.
 *
 * Request body:
 * {
 *   email: string (required - contractor's email)
 *   workOrderId: string (required - work order to grant access to)
 *   expiresHours?: number (optional, default 72)
 * }
 *
 * Returns:
 * {
 *   token: string (the magic link token)
 *   url: string (full magic link URL)
 *   expiresAt: string (ISO timestamp)
 * }
 */
export async function POST(request: NextRequest) {
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  try {
    // Verify admin/manager session
    const session = await getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    // Only admin and property_manager can send magic links
    if (session.role !== 'kewa' && session.role !== 'imeri') {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, workOrderId, expiresHours = 72 } = body

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email ist erforderlich' },
        { status: 400 }
      )
    }

    if (!workOrderId || typeof workOrderId !== 'string') {
      return NextResponse.json(
        { error: 'Arbeitsauftrag-ID ist erforderlich' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify work order exists and get partner info
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select(`
        id,
        title,
        partner_id,
        partners (
          id,
          email,
          company_name
        )
      `)
      .eq('id', workOrderId)
      .single()

    if (woError || !workOrder) {
      return NextResponse.json(
        { error: 'Arbeitsauftrag nicht gefunden' },
        { status: 404 }
      )
    }

    // Calculate expiration
    const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000)

    // Create magic link token using the database function
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('create_magic_link_token', {
        p_email: email.toLowerCase().trim(),
        p_purpose: 'work_order_access',
        p_work_order_id: workOrderId,
        p_user_id: null,
        p_expires_hours: expiresHours,
        p_created_by: session.userId
      })

    if (tokenError || !tokenData) {
      console.error('Failed to create magic link token:', tokenError)
      return NextResponse.json(
        { error: 'Token konnte nicht erstellt werden' },
        { status: 500 }
      )
    }

    // Build the magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const magicLinkUrl = `${baseUrl}/contractor/${tokenData}`

    // Audit log
    await createAuthAuditLog(supabase, {
      action: 'auth.magic_link.sent',
      userId: session.userId,
      ipAddress,
      userAgent,
      details: {
        email,
        workOrderId,
        workOrderTitle: workOrder.title,
        expiresAt: expiresAt.toISOString(),
        token: tokenData
      }
    })

    return NextResponse.json({
      success: true,
      token: tokenData,
      url: magicLinkUrl,
      expiresAt: expiresAt.toISOString(),
      // Include email mailto: link for easy copy
      mailtoLink: buildMailtoLink(
        email,
        workOrder.title,
        magicLinkUrl,
        expiresAt
      )
    })
  } catch (error) {
    console.error('Magic link send error:', error)
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

/**
 * Build a mailto: link with pre-filled subject and body
 */
function buildMailtoLink(
  email: string,
  workOrderTitle: string,
  magicLinkUrl: string,
  expiresAt: Date
): string {
  const subject = encodeURIComponent(`Arbeitsauftrag: ${workOrderTitle}`)
  const body = encodeURIComponent(
    `Guten Tag,\n\n` +
    `Sie haben einen neuen Arbeitsauftrag erhalten.\n\n` +
    `Bitte klicken Sie auf den folgenden Link, um den Auftrag anzusehen:\n` +
    `${magicLinkUrl}\n\n` +
    `Der Link ist gueltig bis: ${expiresAt.toLocaleDateString('de-CH')} ${expiresAt.toLocaleTimeString('de-CH')}\n\n` +
    `Mit freundlichen Gruessen\n` +
    `KEWA AG`
  )

  return `mailto:${email}?subject=${subject}&body=${body}`
}
