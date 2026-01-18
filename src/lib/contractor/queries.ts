/**
 * Contractor Query Utilities
 *
 * Server-side queries for contractor dashboard data.
 * Fetches all work orders for a contractor by their email address.
 *
 * Key design:
 * - Query by partner email (not work order ID) to show ALL work orders
 * - Exclude draft status (not yet sent to contractor)
 * - Include room/unit/building relations for location display
 * - Sort by created_at descending (newest first)
 */

import { createClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface WorkOrderLocation {
  id: string
  name: string
  room_type: string
  unit: {
    id: string
    name: string
    building: {
      id: string
      name: string
      address: string | null
    } | null
  } | null
}

export interface WorkOrderPartner {
  id: string
  company_name: string
  email: string | null
}

export interface ContractorWorkOrder {
  id: string
  title: string
  description: string | null
  scope_of_work: string | null
  status: string
  requested_start_date: string | null
  requested_end_date: string | null
  proposed_start_date: string | null
  proposed_end_date: string | null
  estimated_cost: number | null
  proposed_cost: number | null
  acceptance_deadline: string | null
  contractor_notes: string | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  room: WorkOrderLocation | null
  partner: WorkOrderPartner | null
}

export type ActionStatus = 'needsAction' | 'inProgress' | 'completed'

export interface GroupedWorkOrders {
  needsAction: ContractorWorkOrder[]
  inProgress: ContractorWorkOrder[]
  completed: ContractorWorkOrder[]
}

// ============================================
// QUERIES
// ============================================

/**
 * Get all work orders for a contractor by their email address.
 *
 * @param email - Contractor's email address (case-insensitive)
 * @returns Array of work orders with relations
 */
export async function getContractorWorkOrders(
  email: string
): Promise<ContractorWorkOrder[]> {
  const supabase = await createClient()

  // Query work orders where partner email matches
  // Use !inner join on partners to filter by email
  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      id,
      title,
      description,
      scope_of_work,
      status,
      requested_start_date,
      requested_end_date,
      proposed_start_date,
      proposed_end_date,
      estimated_cost,
      proposed_cost,
      acceptance_deadline,
      contractor_notes,
      viewed_at,
      accepted_at,
      rejected_at,
      rejection_reason,
      created_at,
      room:rooms (
        id,
        name,
        room_type,
        unit:units (
          id,
          name,
          building:buildings (
            id,
            name,
            address
          )
        )
      ),
      partner:partners!inner (
        id,
        company_name,
        email
      )
    `)
    .ilike('partners.email', email.toLowerCase())
    .not('status', 'eq', 'draft')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch contractor work orders:', error)
    return []
  }

  return (data || []) as unknown as ContractorWorkOrder[]
}

/**
 * Group work orders by action status.
 *
 * Groups:
 * - needsAction: sent, viewed (awaiting contractor response)
 * - inProgress: accepted, in_progress, blocked
 * - completed: done, inspected, closed, rejected
 *
 * @param workOrders - Array of work orders
 * @returns Grouped work orders
 */
export function groupWorkOrdersByStatus(
  workOrders: ContractorWorkOrder[]
): GroupedWorkOrders {
  const needsAction: ContractorWorkOrder[] = []
  const inProgress: ContractorWorkOrder[] = []
  const completed: ContractorWorkOrder[] = []

  for (const wo of workOrders) {
    switch (wo.status) {
      case 'sent':
      case 'viewed':
        needsAction.push(wo)
        break
      case 'accepted':
      case 'in_progress':
      case 'blocked':
        inProgress.push(wo)
        break
      case 'done':
      case 'inspected':
      case 'closed':
      case 'rejected':
        completed.push(wo)
        break
      default:
        // Unknown status goes to completed
        completed.push(wo)
    }
  }

  return { needsAction, inProgress, completed }
}

/**
 * Get action status for a work order.
 *
 * @param status - Work order status
 * @returns Action status category
 */
export function getActionStatus(status: string): ActionStatus {
  switch (status) {
    case 'sent':
    case 'viewed':
      return 'needsAction'
    case 'accepted':
    case 'in_progress':
    case 'blocked':
      return 'inProgress'
    default:
      return 'completed'
  }
}

/**
 * Get a single work order by ID with full details.
 * Only returns if the work order belongs to the contractor (by email).
 *
 * @param workOrderId - UUID of the work order
 * @param contractorEmail - Email to verify ownership
 * @returns Work order or null if not found/unauthorized
 */
export async function getContractorWorkOrderById(
  workOrderId: string,
  contractorEmail: string
): Promise<ContractorWorkOrder | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      id,
      title,
      description,
      scope_of_work,
      status,
      requested_start_date,
      requested_end_date,
      proposed_start_date,
      proposed_end_date,
      estimated_cost,
      proposed_cost,
      acceptance_deadline,
      contractor_notes,
      viewed_at,
      accepted_at,
      rejected_at,
      rejection_reason,
      created_at,
      room:rooms (
        id,
        name,
        room_type,
        unit:units (
          id,
          name,
          building:buildings (
            id,
            name,
            address
          )
        )
      ),
      partner:partners!inner (
        id,
        company_name,
        email
      )
    `)
    .eq('id', workOrderId)
    .ilike('partners.email', contractorEmail.toLowerCase())
    .single()

  if (error || !data) {
    return null
  }

  return data as unknown as ContractorWorkOrder
}

/**
 * Get count of work orders needing action.
 *
 * @param email - Contractor's email
 * @returns Count of work orders in sent/viewed status
 */
export async function getActionNeededCount(email: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['sent', 'viewed'])
    .eq('partners.email', email.toLowerCase())

  if (error) {
    console.error('Failed to count action needed:', error)
    return 0
  }

  return count || 0
}
