/**
 * Unit Timeline Queries
 *
 * Server-side query module for fetching unified timeline events.
 * Aggregates from: renovation_projects, work_orders, condition_history, invoices
 *
 * Phase 11-01: Unit Timeline View
 * Requirement: HIST-01
 */

import { createPublicClient } from '@/lib/supabase/with-org'
import type {
  TimelineEvent,
  TimelineEventType,
  TimelineResponse
} from '@/types/timeline'

// =============================================
// CONSTANTS
// =============================================

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

// =============================================
// MAIN QUERY FUNCTION
// =============================================

/**
 * Fetch unified timeline events for a unit
 *
 * Aggregates events from:
 * - renovation_projects: created, status changes
 * - work_orders: created, accepted, completed, etc.
 * - condition_history: room condition changes
 * - invoices: paid invoices
 *
 * @param unitId - Unit UUID
 * @param limit - Max events to return (default 20, max 100)
 * @param offset - Pagination offset (default 0)
 * @returns TimelineResponse with events and pagination info
 */
export async function fetchUnitTimeline(
  unitId: string,
  limit: number = DEFAULT_LIMIT,
  offset: number = 0
): Promise<TimelineResponse> {
  const supabase = await createPublicClient()

  // Clamp limit
  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT)

  // Fetch events from all sources in parallel
  const [projectEvents, workOrderEvents, conditionEvents, invoiceEvents] =
    await Promise.all([
      fetchProjectEvents(supabase, unitId),
      fetchWorkOrderEvents(supabase, unitId),
      fetchConditionEvents(supabase, unitId),
      fetchInvoiceEvents(supabase, unitId)
    ])

  // Combine and sort by timestamp (newest first)
  const allEvents: TimelineEvent[] = [
    ...projectEvents,
    ...workOrderEvents,
    ...conditionEvents,
    ...invoiceEvents
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Calculate pagination
  const total = allEvents.length
  const paginatedEvents = allEvents.slice(offset, offset + safeLimit)
  const hasMore = offset + safeLimit < total

  return {
    events: paginatedEvents,
    pagination: {
      limit: safeLimit,
      offset,
      hasMore,
      total
    }
  }
}

// =============================================
// SOURCE-SPECIFIC FETCHERS
// =============================================

/**
 * Fetch project-related events for a unit
 */
async function fetchProjectEvents(
  supabase: Awaited<ReturnType<typeof createPublicClient>>,
  unitId: string
): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from('renovation_projects')
    .select('id, name, status, created_at, updated_at')
    .eq('unit_id', unitId)
    .order('updated_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching project events:', error)
    return []
  }

  const events: TimelineEvent[] = []

  for (const project of data) {
    // Project creation event
    events.push({
      id: `project-created-${project.id}`,
      event_type: 'project',
      event_subtype: 'created',
      title: `Projekt erstellt: ${project.name}`,
      entity_id: project.id,
      timestamp: project.created_at,
      metadata: {
        status: project.status
      }
    })

    // Add status event if different from created (project progressed)
    if (project.status !== 'draft' && project.updated_at !== project.created_at) {
      events.push({
        id: `project-status-${project.id}-${project.status}`,
        event_type: 'project',
        event_subtype: project.status,
        title: `Projekt ${getProjectStatusLabel(project.status)}: ${project.name}`,
        entity_id: project.id,
        timestamp: project.updated_at,
        metadata: {
          status: project.status
        }
      })
    }
  }

  return events
}

/**
 * Fetch work order events for a unit (via projects)
 */
async function fetchWorkOrderEvents(
  supabase: Awaited<ReturnType<typeof createPublicClient>>,
  unitId: string
): Promise<TimelineEvent[]> {
  // First get all project IDs for this unit
  const { data: projects, error: projectError } = await supabase
    .from('renovation_projects')
    .select('id')
    .eq('unit_id', unitId)

  if (projectError || !projects || projects.length === 0) {
    return []
  }

  const projectIds = projects.map((p) => p.id)

  // Then get work orders for these projects
  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      id,
      title,
      status,
      created_at,
      updated_at,
      accepted_at,
      renovation_project_id,
      partner:partners (
        company_name
      ),
      project:renovation_projects (
        name
      )
    `)
    .in('renovation_project_id', projectIds)
    .order('updated_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching work order events:', error)
    return []
  }

  const events: TimelineEvent[] = []

  for (const wo of data) {
    // Extract single relations from Supabase array return
    const partner = Array.isArray(wo.partner) ? wo.partner[0] : wo.partner
    const project = Array.isArray(wo.project) ? wo.project[0] : wo.project

    // Work order creation event
    events.push({
      id: `work-order-created-${wo.id}`,
      event_type: 'work_order',
      event_subtype: 'created',
      title: `Arbeitsauftrag erstellt: ${wo.title}`,
      entity_id: wo.id,
      timestamp: wo.created_at,
      metadata: {
        status: wo.status,
        partner_name: partner?.company_name,
        project_name: project?.name
      }
    })

    // Acceptance event if accepted
    if (wo.accepted_at) {
      events.push({
        id: `work-order-accepted-${wo.id}`,
        event_type: 'work_order',
        event_subtype: 'accepted',
        title: `Arbeitsauftrag angenommen: ${wo.title}`,
        entity_id: wo.id,
        timestamp: wo.accepted_at,
        metadata: {
          status: 'accepted',
          partner_name: partner?.company_name,
          project_name: project?.name
        }
      })
    }

    // Status event if completed or other terminal status
    if (
      wo.status === 'done' ||
      wo.status === 'completed' ||
      wo.status === 'rejected'
    ) {
      events.push({
        id: `work-order-status-${wo.id}-${wo.status}`,
        event_type: 'work_order',
        event_subtype: wo.status,
        title: `Arbeitsauftrag ${getWorkOrderStatusLabel(wo.status)}: ${wo.title}`,
        entity_id: wo.id,
        timestamp: wo.updated_at,
        metadata: {
          status: wo.status,
          partner_name: partner?.company_name,
          project_name: project?.name
        }
      })
    }
  }

  return events
}

/**
 * Fetch condition change events for a unit (via rooms)
 */
async function fetchConditionEvents(
  supabase: Awaited<ReturnType<typeof createPublicClient>>,
  unitId: string
): Promise<TimelineEvent[]> {
  // First get all room IDs for this unit
  const { data: rooms, error: roomError } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('unit_id', unitId)

  if (roomError || !rooms || rooms.length === 0) {
    return []
  }

  const roomIds = rooms.map((r) => r.id)
  const roomMap = new Map(rooms.map((r) => [r.id, r.name]))

  // Get condition history for these rooms
  const { data, error } = await supabase
    .from('condition_history')
    .select('id, entity_id, old_condition, new_condition, notes, changed_at')
    .eq('entity_type', 'room')
    .in('entity_id', roomIds)
    .order('changed_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching condition events:', error)
    return []
  }

  return data.map((ch) => ({
    id: `condition-${ch.id}`,
    event_type: 'condition' as TimelineEventType,
    event_subtype: ch.new_condition,
    title: `Zustand geaendert: ${roomMap.get(ch.entity_id) || 'Raum'}`,
    description: ch.notes || undefined,
    entity_id: ch.entity_id,
    timestamp: ch.changed_at,
    metadata: {
      condition: ch.new_condition,
      old_condition: ch.old_condition,
      room_name: roomMap.get(ch.entity_id)
    }
  }))
}

/**
 * Fetch paid invoice events for a unit (via projects)
 */
async function fetchInvoiceEvents(
  supabase: Awaited<ReturnType<typeof createPublicClient>>,
  unitId: string
): Promise<TimelineEvent[]> {
  // First get all project IDs for this unit
  const { data: projects, error: projectError } = await supabase
    .from('renovation_projects')
    .select('id, name')
    .eq('unit_id', unitId)

  if (projectError || !projects || projects.length === 0) {
    return []
  }

  const projectIds = projects.map((p) => p.id)
  const projectMap = new Map(projects.map((p) => [p.id, p.name]))

  // Get paid invoices for these projects
  const { data, error } = await supabase
    .from('invoices')
    .select('id, title, total_gross, paid_at, renovation_project_id')
    .in('renovation_project_id', projectIds)
    .not('paid_at', 'is', null)
    .order('paid_at', { ascending: false })

  if (error || !data) {
    console.error('Error fetching invoice events:', error)
    return []
  }

  return data.map((inv) => ({
    id: `invoice-paid-${inv.id}`,
    event_type: 'cost' as TimelineEventType,
    event_subtype: 'paid',
    title: `Rechnung bezahlt: ${inv.title}`,
    entity_id: inv.id,
    timestamp: inv.paid_at!,
    metadata: {
      amount: inv.total_gross,
      status: 'paid',
      project_name: projectMap.get(inv.renovation_project_id!)
    }
  }))
}

// =============================================
// HELPERS
// =============================================

/**
 * Get German label for project status
 */
function getProjectStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Entwurf',
    planned: 'geplant',
    in_progress: 'in Arbeit',
    on_hold: 'pausiert',
    completed: 'abgeschlossen',
    cancelled: 'abgebrochen',
    approved: 'freigegeben'
  }
  return labels[status] || status
}

/**
 * Get German label for work order status
 */
function getWorkOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Entwurf',
    sent: 'gesendet',
    viewed: 'angesehen',
    accepted: 'angenommen',
    rejected: 'abgelehnt',
    in_progress: 'in Arbeit',
    done: 'erledigt',
    completed: 'abgeschlossen'
  }
  return labels[status] || status
}
