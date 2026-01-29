/**
 * Notification Trigger Functions
 *
 * Event trigger functions that create and dispatch notifications on workflow events.
 * Phase: 24-push-notifications
 */

import { createClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications/send'
import type { NotificationType } from '@/types/notifications'

// =============================================
// HELPERS
// =============================================

/**
 * Get all users with specified roles
 */
async function getUsersByRoles(roleNames: string[]): Promise<string[]> {
  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from('user_roles')
    .select('user_id, roles!inner(name)')
    .in('roles.name', roleNames)

  if (error) {
    console.error('Error fetching users by roles:', error)
    return []
  }

  // Get unique user IDs (user might have multiple roles)
  const userIds = [...new Set(users?.map((u) => u.user_id) || [])]
  return userIds
}

/**
 * Get contractor user for a work order (based on partner assignment)
 */
async function getContractorUserForWorkOrder(workOrderId: string): Promise<string | null> {
  const supabase = await createClient()

  // Get work order's partner_id
  const { data: workOrder, error: woError } = await supabase
    .from('work_orders')
    .select('partner_id')
    .eq('id', workOrderId)
    .single()

  if (woError || !workOrder?.partner_id) {
    return null
  }

  // Find user linked to that partner with external_contractor role
  const { data: users, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      user_roles!inner(
        role_id,
        roles!inner(name)
      )
    `)
    .eq('partner_id', workOrder.partner_id)
    .eq('user_roles.roles.name', 'external_contractor')
    .limit(1)

  if (userError || !users || users.length === 0) {
    return null
  }

  return users[0].id
}

/**
 * Get work orders with deadlines approaching within 24 hours
 */
export async function getUpcomingDeadlines(): Promise<
  Array<{ id: string; wo_number: string; acceptance_deadline: string }>
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('work_orders')
    .select('id, wo_number, acceptance_deadline')
    .in('status', ['sent', 'viewed'])
    .gte('acceptance_deadline', new Date().toISOString())
    .lte('acceptance_deadline', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('Error fetching upcoming deadlines:', error)
    return []
  }

  return data || []
}

// =============================================
// STATUS MAPPING
// =============================================

/**
 * Map work order status to German notification text
 */
function mapStatusToGerman(status: string): string {
  const statusMap: Record<string, string> = {
    sent: 'wurde versendet',
    accepted: 'wurde akzeptiert',
    rejected: 'wurde abgelehnt',
  }

  return statusMap[status] || `Status: ${status}`
}

/**
 * Format date for German display (YYYY-MM-DD -> DD.MM.YYYY)
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  } catch {
    return dateString
  }
}

// =============================================
// TRIGGER FUNCTIONS
// =============================================

/**
 * Notify when work order status changes
 *
 * Targets: admin, property_manager (always)
 *          + contractor (if status is 'sent')
 */
export async function notifyWorkOrderStatusChange(
  workOrderId: string,
  woNumber: string,
  newStatus: string,
  actorId: string
): Promise<void> {
  try {
    // Get admin and property_manager users
    const targetUsers = await getUsersByRoles(['admin', 'property_manager'])

    // If status is 'sent', also notify the contractor
    if (newStatus === 'sent') {
      const contractorUserId = await getContractorUserForWorkOrder(workOrderId)
      if (contractorUserId && !targetUsers.includes(contractorUserId)) {
        targetUsers.push(contractorUserId)
      }
    }

    if (targetUsers.length === 0) {
      console.warn('No target users found for work order status notification')
      return
    }

    // Send notification
    await sendNotification({
      type: 'work_order_status',
      title: `Arbeitsauftrag ${woNumber}`,
      body: mapStatusToGerman(newStatus),
      entity_type: 'work_order',
      entity_id: workOrderId,
      actor_id: actorId,
      urgency: 'normal',
      url: `/dashboard/auftraege/${workOrderId}`,
      targetUserIds: targetUsers,
    })
  } catch (error) {
    console.error('Error sending work order status notification:', error)
    // Don't throw - fire-and-forget pattern
  }
}

/**
 * Notify when approval is needed for invoice or change order
 *
 * Targets: admin, property_manager, accounting
 */
export async function notifyApprovalNeeded(
  entityType: 'invoice' | 'change_order',
  entityId: string,
  entityNumber: string,
  actorId: string
): Promise<void> {
  try {
    // Get users who can approve
    const targetUsers = await getUsersByRoles(['admin', 'property_manager', 'accounting'])

    if (targetUsers.length === 0) {
      console.warn('No target users found for approval notification')
      return
    }

    // Build notification based on entity type
    const title = entityType === 'invoice'
      ? `Rechnung ${entityNumber}`
      : `Änderungsauftrag ${entityNumber}`

    const url = entityType === 'invoice'
      ? `/dashboard/kosten/rechnungen/${entityId}`
      : `/dashboard/aenderungsauftraege/${entityId}`

    // Send notification
    await sendNotification({
      type: 'approval_needed',
      title,
      body: 'Genehmigung erforderlich',
      entity_type: entityType === 'invoice' ? 'invoice' : 'change_order',
      entity_id: entityId,
      actor_id: actorId,
      urgency: 'urgent',
      url,
      targetUserIds: targetUsers,
    })
  } catch (error) {
    console.error('Error sending approval notification:', error)
    // Don't throw - fire-and-forget pattern
  }
}

/**
 * Notify when work order acceptance deadline is approaching (24h reminder)
 *
 * Targets: admin, property_manager
 */
export async function notifyDeadlineReminder(
  workOrderId: string,
  woNumber: string,
  deadlineDate: string
): Promise<void> {
  try {
    // Get admin and property_manager users
    const targetUsers = await getUsersByRoles(['admin', 'property_manager'])

    if (targetUsers.length === 0) {
      console.warn('No target users found for deadline reminder notification')
      return
    }

    // Send notification
    await sendNotification({
      type: 'deadline_reminder',
      title: `Frist-Erinnerung: ${woNumber}`,
      body: `Annahmefrist läuft am ${formatDate(deadlineDate)} ab`,
      entity_type: 'work_order',
      entity_id: workOrderId,
      // actor_id omitted (system-triggered)
      urgency: 'urgent',
      url: `/dashboard/auftraege/${workOrderId}`,
      targetUserIds: targetUsers,
    })
  } catch (error) {
    console.error('Error sending deadline reminder notification:', error)
    // Don't throw - fire-and-forget pattern
  }
}
