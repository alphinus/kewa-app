/**
 * Work Order Event Logging Utilities
 *
 * Provides functions to log and retrieve work order events.
 * Events track all work order activities with timestamps.
 *
 * Implements: EXT-14 (Timestamped event logging)
 */

import { createClient } from '@/lib/supabase/server'

// ============================================
// EVENT TYPES
// ============================================

export type WorkOrderEventType =
  | 'created'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'counter_offer_submitted'
  | 'counter_offer_approved'
  | 'counter_offer_rejected'
  | 'started'
  | 'completed'
  | 'upload_added'
  | 'upload_removed'
  | 'status_changed'

export type WorkOrderActorType = 'kewa' | 'contractor' | 'system'

export interface WorkOrderEventData {
  // Status change data
  old_status?: string
  new_status?: string
  // Counter-offer data
  proposed_cost?: number | null
  proposed_start_date?: string | null
  proposed_end_date?: string | null
  notes?: string | null
  // Upload data
  file_name?: string
  file_type?: string
  media_id?: string
  context?: string
  // Rejection data
  rejection_reason?: string
  // Work order creation data
  title?: string
  status?: string
  partner_id?: string
  // Generic data
  [key: string]: unknown
}

export interface WorkOrderEvent {
  id: string
  work_order_id: string
  event_type: WorkOrderEventType
  event_data: WorkOrderEventData
  actor_type: WorkOrderActorType
  actor_id: string | null
  actor_email: string | null
  created_at: string
}

// ============================================
// GERMAN LABELS
// ============================================

/**
 * German labels for event types.
 * Used in UI for display.
 */
export const EVENT_TYPE_LABELS: Record<WorkOrderEventType, string> = {
  created: 'Erstellt',
  sent: 'Gesendet',
  viewed: 'Angesehen',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
  counter_offer_submitted: 'Gegenangebot eingereicht',
  counter_offer_approved: 'Gegenangebot genehmigt',
  counter_offer_rejected: 'Gegenangebot abgelehnt',
  started: 'Arbeit gestartet',
  completed: 'Arbeit abgeschlossen',
  upload_added: 'Datei hochgeladen',
  upload_removed: 'Datei entfernt',
  status_changed: 'Status geaendert',
}

/**
 * German labels for actor types.
 */
export const ACTOR_TYPE_LABELS: Record<WorkOrderActorType, string> = {
  kewa: 'KEWA',
  contractor: 'Handwerker',
  system: 'System',
}

// ============================================
// EVENT LOGGING FUNCTIONS
// ============================================

/**
 * Log a work order event.
 *
 * @param workOrderId - UUID of the work order
 * @param eventType - Type of event
 * @param data - Additional event data (JSONB)
 * @param actor - Actor information
 * @returns Created event or null on error
 */
export async function logWorkOrderEvent(
  workOrderId: string,
  eventType: WorkOrderEventType,
  data: WorkOrderEventData = {},
  actor: {
    type: WorkOrderActorType
    id?: string | null
    email?: string | null
  } = { type: 'system' }
): Promise<WorkOrderEvent | null> {
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('work_order_events')
    .insert({
      work_order_id: workOrderId,
      event_type: eventType,
      event_data: data,
      actor_type: actor.type,
      actor_id: actor.id || null,
      actor_email: actor.email || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to log work order event:', error)
    return null
  }

  return event as WorkOrderEvent
}

// ============================================
// EVENT RETRIEVAL FUNCTIONS
// ============================================

export interface GetEventsOptions {
  limit?: number
  offset?: number
  eventTypes?: WorkOrderEventType[]
}

/**
 * Get events for a work order with pagination.
 *
 * @param workOrderId - UUID of the work order
 * @param options - Query options
 * @returns Array of events and total count
 */
export async function getWorkOrderEvents(
  workOrderId: string,
  options: GetEventsOptions = {}
): Promise<{ events: WorkOrderEvent[]; total: number }> {
  const { limit = 50, offset = 0, eventTypes } = options
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('work_order_events')
    .select('*', { count: 'exact' })
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false })

  // Filter by event types if specified
  if (eventTypes && eventTypes.length > 0) {
    query = query.in('event_type', eventTypes)
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to get work order events:', error)
    return { events: [], total: 0 }
  }

  return {
    events: (data || []) as WorkOrderEvent[],
    total: count || 0,
  }
}

/**
 * Get recent events across all work orders (for admin dashboard).
 *
 * @param limit - Maximum number of events to return
 * @returns Array of events with work order info
 */
export async function getRecentEvents(
  limit: number = 20
): Promise<(WorkOrderEvent & { work_order: { id: string; title: string } })[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('work_order_events')
    .select(`
      *,
      work_order:work_orders (
        id,
        title
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to get recent events:', error)
    return []
  }

  return data as (WorkOrderEvent & { work_order: { id: string; title: string } })[]
}

// ============================================
// CONVENIENCE LOGGING FUNCTIONS
// ============================================

/**
 * Log when a work order is sent to contractor.
 */
export async function logSentEvent(
  workOrderId: string,
  userId: string,
  partnerEmail: string
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'sent',
    { partner_email: partnerEmail },
    { type: 'kewa', id: userId }
  )
}

/**
 * Log when contractor views the work order.
 */
export async function logViewedEvent(
  workOrderId: string,
  contractorEmail: string
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'viewed',
    {},
    { type: 'contractor', email: contractorEmail }
  )
}

/**
 * Log when contractor accepts.
 */
export async function logAcceptedEvent(
  workOrderId: string,
  contractorEmail: string,
  data: { proposed_cost?: number | null; proposed_start_date?: string | null; proposed_end_date?: string | null } = {}
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'accepted',
    data,
    { type: 'contractor', email: contractorEmail }
  )
}

/**
 * Log when contractor rejects.
 */
export async function logRejectedEvent(
  workOrderId: string,
  contractorEmail: string,
  rejectionReason: string
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'rejected',
    { rejection_reason: rejectionReason },
    { type: 'contractor', email: contractorEmail }
  )
}

/**
 * Log when contractor submits counter-offer.
 */
export async function logCounterOfferSubmittedEvent(
  workOrderId: string,
  contractorEmail: string,
  data: { proposed_cost?: number | null; proposed_start_date?: string | null; proposed_end_date?: string | null; notes?: string | null }
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'counter_offer_submitted',
    data,
    { type: 'contractor', email: contractorEmail }
  )
}

/**
 * Log when KEWA approves counter-offer.
 */
export async function logCounterOfferApprovedEvent(
  workOrderId: string,
  userId: string,
  notes?: string
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'counter_offer_approved',
    notes ? { notes } : {},
    { type: 'kewa', id: userId }
  )
}

/**
 * Log when KEWA rejects counter-offer.
 */
export async function logCounterOfferRejectedEvent(
  workOrderId: string,
  userId: string,
  notes?: string
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'counter_offer_rejected',
    notes ? { notes } : {},
    { type: 'kewa', id: userId }
  )
}

/**
 * Log when work is started.
 */
export async function logStartedEvent(
  workOrderId: string,
  contractorEmail: string
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'started',
    {},
    { type: 'contractor', email: contractorEmail }
  )
}

/**
 * Log when work is completed.
 */
export async function logCompletedEvent(
  workOrderId: string,
  contractorEmail: string
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'completed',
    {},
    { type: 'contractor', email: contractorEmail }
  )
}

/**
 * Log when file is uploaded.
 */
export async function logUploadAddedEvent(
  workOrderId: string,
  contractorEmail: string,
  fileData: { file_name: string; file_type?: string; media_id?: string; context?: string }
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'upload_added',
    fileData,
    { type: 'contractor', email: contractorEmail }
  )
}

/**
 * Log when file is removed.
 */
export async function logUploadRemovedEvent(
  workOrderId: string,
  actorEmail: string,
  actorType: 'kewa' | 'contractor',
  fileData: { file_name: string; media_id?: string }
): Promise<WorkOrderEvent | null> {
  return logWorkOrderEvent(
    workOrderId,
    'upload_removed',
    fileData,
    { type: actorType, email: actorEmail }
  )
}
