/**
 * Tenant Notification Triggers
 *
 * Event trigger functions for tenant notifications via push and email.
 * Sends notifications when ticket status changes or operator replies.
 *
 * Phase 29: Tenant Extras & UX
 */

import { createPublicClient } from '@/lib/supabase/with-org'
import { sendNotification } from '@/lib/notifications/send'
import { sendEmail } from '@/lib/email/send'
import TicketStatusEmail from '@/emails/ticket-status-changed'
import TicketReplyEmail from '@/emails/ticket-reply-received'
import type { TicketStatus, TicketUrgency, TICKET_STATUS_LABELS } from '@/types/portal'

// Re-export labels for use in this module
const STATUS_LABELS: Record<TicketStatus, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  geschlossen: 'Geschlossen',
  storniert: 'Storniert',
}

// =============================================
// TYPES
// =============================================

interface TenantNotificationData {
  tenantUserId: string
  tenantEmail: string
  tenantName: string
  ticketNumber: string
}

interface NotifyStatusChangeParams extends TenantNotificationData {
  ticketId: string
  oldStatus: TicketStatus
  newStatus: TicketStatus
  ticketUrgency?: TicketUrgency
}

interface NotifyReplyParams extends TenantNotificationData {
  ticketId: string
  replyContent: string
  operatorName: string
}

interface DeliveryResult {
  pushSuccess: boolean
  emailSuccess: boolean
}

// =============================================
// HELPERS
// =============================================

/**
 * Get tenant notification data from ticket
 *
 * Fetches tenant user details from ticket's created_by field.
 */
export async function getTenantNotificationData(
  ticketId: string
): Promise<TenantNotificationData | null> {
  try {
    const supabase = await createPublicClient()

    // Get ticket with tenant user details
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        ticket_number,
        created_by,
        tenant:users!tickets_created_by_fkey (
          id,
          email,
          display_name
        )
      `)
      .eq('id', ticketId)
      .single()

    if (error || !ticket?.tenant) {
      console.error('Error fetching tenant notification data:', error)
      return null
    }

    // Supabase returns single object for one-to-one relations
    const tenant = ticket.tenant as unknown as { id: string; email: string; display_name: string }

    return {
      tenantUserId: tenant.id,
      tenantEmail: tenant.email,
      tenantName: tenant.display_name || 'Mieter',
      ticketNumber: ticket.ticket_number,
    }
  } catch (err) {
    console.error('Error in getTenantNotificationData:', err)
    return null
  }
}

/**
 * Log delivery status for debugging
 */
function logDeliveryStatus(
  ticketId: string,
  eventType: string,
  result: DeliveryResult
): void {
  try {
    console.log(
      `[TenantNotification] ${eventType} for ticket ${ticketId}: ` +
        `push=${result.pushSuccess}, email=${result.emailSuccess}`
    )
  } catch {
    // Ignore logging errors
  }
}

/**
 * Build ticket URL for tenant portal
 */
function buildTicketUrl(ticketId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.kewa.app'
  return `${baseUrl}/portal/tickets/${ticketId}`
}

// =============================================
// STATUS CHANGE NOTIFICATION
// =============================================

/**
 * Notify tenant when their ticket status changes
 *
 * Sends both push notification (if subscribed) and email.
 * Fire-and-forget: never throws, logs errors.
 */
export async function notifyTenantTicketStatusChange(
  params: NotifyStatusChangeParams
): Promise<DeliveryResult> {
  const result: DeliveryResult = {
    pushSuccess: false,
    emailSuccess: false,
  }

  const ticketUrl = buildTicketUrl(params.ticketId)
  const statusLabel = STATUS_LABELS[params.newStatus]

  // 1. Push notification
  try {
    // Determine urgency - use 'urgent' for notfall tickets
    const urgency = params.ticketUrgency === 'notfall' ? 'urgent' : 'normal'

    await sendNotification({
      type: 'work_order_status', // Reuse existing type for ticket status
      title: `Ticket ${params.ticketNumber}`,
      body: `Neuer Status: ${statusLabel}`,
      entity_type: 'work_order', // Map to existing entity type
      entity_id: params.ticketId,
      urgency,
      url: `/portal/tickets/${params.ticketId}`,
      targetUserIds: [params.tenantUserId],
    })
    result.pushSuccess = true
  } catch (err) {
    console.error('Push notification failed for ticket status:', err)
    // Continue to email
  }

  // 2. Email notification
  try {
    const emailResult = await sendEmail({
      to: params.tenantEmail,
      subject: `Ticket ${params.ticketNumber} - ${statusLabel}`,
      react: TicketStatusEmail({
        tenantName: params.tenantName,
        ticketNumber: params.ticketNumber,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
        ticketUrl,
      }),
    })
    result.emailSuccess = emailResult.success
  } catch (err) {
    console.error('Email notification failed for ticket status:', err)
  }

  // Log delivery status
  logDeliveryStatus(params.ticketId, 'status_change', result)

  return result
}

// =============================================
// REPLY NOTIFICATION
// =============================================

/**
 * Notify tenant when operator replies to their ticket
 *
 * Sends both push notification (if subscribed) and email.
 * Fire-and-forget: never throws, logs errors.
 */
export async function notifyTenantTicketReply(
  params: NotifyReplyParams
): Promise<DeliveryResult> {
  const result: DeliveryResult = {
    pushSuccess: false,
    emailSuccess: false,
  }

  const ticketUrl = buildTicketUrl(params.ticketId)

  // 1. Push notification
  try {
    await sendNotification({
      type: 'work_order_status', // Reuse existing type
      title: `Ticket ${params.ticketNumber}`,
      body: `Neue Nachricht von ${params.operatorName}`,
      entity_type: 'work_order', // Map to existing entity type
      entity_id: params.ticketId,
      urgency: 'normal',
      url: `/portal/tickets/${params.ticketId}`,
      targetUserIds: [params.tenantUserId],
    })
    result.pushSuccess = true
  } catch (err) {
    console.error('Push notification failed for ticket reply:', err)
    // Continue to email
  }

  // 2. Email notification
  try {
    const emailResult = await sendEmail({
      to: params.tenantEmail,
      subject: `Neue Nachricht zu Ticket ${params.ticketNumber}`,
      react: TicketReplyEmail({
        tenantName: params.tenantName,
        ticketNumber: params.ticketNumber,
        ticketUrl,
        replyContent: params.replyContent,
        operatorName: params.operatorName,
      }),
    })
    result.emailSuccess = emailResult.success
  } catch (err) {
    console.error('Email notification failed for ticket reply:', err)
  }

  // Log delivery status
  logDeliveryStatus(params.ticketId, 'reply', result)

  return result
}
