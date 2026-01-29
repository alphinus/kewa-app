/**
 * Work Order Send API
 *
 * POST /api/work-orders/[id]/send - Create magic link and prepare email
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import { createMagicLink } from '@/lib/magic-link'
import { logSentEvent } from '@/lib/work-orders/events'
import { notifyWorkOrderStatusChange } from '@/lib/notifications/triggers'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Build mailto link with pre-filled content
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
    `Auftrag: ${workOrderTitle}\n\n` +
    `Bitte klicken Sie auf den folgenden Link, um den Auftrag anzusehen und zu beantworten:\n` +
    `${magicLinkUrl}\n\n` +
    `Der Link ist gueltig bis: ${expiresAt.toLocaleDateString('de-CH')} ${expiresAt.toLocaleTimeString('de-CH')}\n\n` +
    `Sie koennen den Auftrag annehmen, ablehnen oder einen Gegenvorschlag machen.\n\n` +
    `Bei Fragen stehen wir Ihnen gerne zur Verfuegung.\n\n` +
    `Mit freundlichen Gruessen\n` +
    `KEWA AG`
  )
  return `mailto:${email}?subject=${subject}&body=${body}`
}

/**
 * POST /api/work-orders/[id]/send - Send work order to contractor
 *
 * Creates magic link, builds mailto link, updates status to 'sent'.
 *
 * Returns:
 * - token: Magic link token
 * - url: Full contractor portal URL
 * - expiresAt: Token expiry datetime
 * - mailtoLink: Pre-filled mailto link
 * - pdfDownloadUrl: URL to download PDF
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid work order ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch work order with partner
    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select(`
        id,
        title,
        wo_number,
        status,
        partner:partners (
          id,
          email,
          company_name
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError || !workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Verify partner exists and has email
    // Supabase returns array for relations in select queries
    const partnerData = Array.isArray(workOrder.partner)
      ? workOrder.partner[0]
      : workOrder.partner
    const partner = partnerData as { id: string; email: string; company_name: string } | null
    if (!partner?.email) {
      return NextResponse.json(
        { error: 'Partner email not found' },
        { status: 400 }
      )
    }

    // Check current status allows sending
    if (workOrder.status !== 'draft') {
      return NextResponse.json(
        { error: `Work order already sent (status: ${workOrder.status})` },
        { status: 400 }
      )
    }

    // Create magic link token
    const { token, url, expiresAt } = await createMagicLink(
      id,
      partner.email,
      { purpose: 'work_order_access' },
      userId
    )

    // Update work order status to 'sent'
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({ status: 'sent' })
      .eq('id', id)

    if (updateError) {
      // If status update fails, the magic link is still valid
      // Log but don't fail the request
      console.error('Error updating work order status:', updateError)
    }

    // Log 'sent' event
    await logSentEvent(id, userId, partner.email)

    // Fire notification for sent status (non-blocking)
    notifyWorkOrderStatusChange(
      id,
      workOrder.wo_number,
      'sent',
      userId
    ).catch(err => console.error('Notification error:', err))

    // Build mailto link
    const mailtoLink = buildMailtoLink(
      partner.email,
      workOrder.title,
      url,
      expiresAt
    )

    // Build PDF download URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const pdfDownloadUrl = `${baseUrl}/api/work-orders/${id}/pdf`

    return NextResponse.json({
      token,
      url,
      expiresAt: expiresAt.toISOString(),
      mailtoLink,
      pdfDownloadUrl,
      partnerEmail: partner.email,
      partnerName: partner.company_name
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/work-orders/[id]/send:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
