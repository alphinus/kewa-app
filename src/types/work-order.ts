/**
 * WorkOrder Types
 *
 * TypeScript types for work orders sent to external contractors.
 * Matches database schema from migration 013_work_order.sql.
 */

import type { WorkOrderStatus, RoomType, TradeCategory } from './index'

// =============================================
// BASE WORK ORDER TYPES
// =============================================

/**
 * WorkOrder entity as stored in database
 */
export interface WorkOrder {
  id: string

  // Relationships
  renovation_project_id: string | null
  task_id: string | null
  room_id: string | null
  partner_id: string | null

  // Content
  title: string
  description: string | null
  scope_of_work: string | null

  // Status workflow
  status: WorkOrderStatus

  // Scheduling: Requested by KEWA
  requested_start_date: string | null  // DATE as ISO string
  requested_end_date: string | null

  // Scheduling: Proposed by contractor
  proposed_start_date: string | null
  proposed_end_date: string | null

  // Scheduling: Actual
  actual_start_date: string | null
  actual_end_date: string | null

  // Magic link access (legacy - tokens now in separate table)
  access_token: string | null
  token_expires_at: string | null
  acceptance_deadline: string | null  // TIMESTAMPTZ

  // Status tracking timestamps
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null

  // Cost tracking
  estimated_cost: number | null
  proposed_cost: number | null
  final_cost: number | null

  // Notes
  internal_notes: string | null  // KEWA only
  contractor_notes: string | null  // From contractor

  // Metadata
  created_by: string | null
  created_at: string
  updated_at: string
}

// =============================================
// RELATED ENTITY TYPES (for joins)
// =============================================

/**
 * Room with unit and building info
 */
export interface WorkOrderRoom {
  id: string
  name: string
  room_type: RoomType
  unit: {
    id: string
    name: string
    building: {
      id: string
      name: string
      address: string
    }
  } | null
}

/**
 * Partner (contractor) info
 */
export interface WorkOrderPartner {
  id: string
  company_name: string
  contact_name: string | null
  email: string
  phone: string | null
  trades: TradeCategory[]
}

/**
 * Renovation project info
 */
export interface WorkOrderProject {
  id: string
  name: string
  description: string | null
  status: string
}

/**
 * Task info
 */
export interface WorkOrderTask {
  id: string
  title: string
  description: string | null
  priority: string
  trade_category: TradeCategory | null
}

// =============================================
// WORK ORDER WITH RELATIONS
// =============================================

/**
 * WorkOrder with all related data joined
 * Used for display and PDF generation
 */
export interface WorkOrderWithRelations extends WorkOrder {
  room: WorkOrderRoom | null
  partner: WorkOrderPartner | null
  project: WorkOrderProject | null
  task: WorkOrderTask | null
}

// =============================================
// API INPUT TYPES
// =============================================

/**
 * Input for creating a new work order
 */
export interface CreateWorkOrderInput {
  // Required
  title: string
  partner_id: string

  // Optional links (at least project or task should be provided)
  renovation_project_id?: string
  task_id?: string
  room_id?: string

  // Content
  description?: string
  scope_of_work?: string

  // Scheduling
  requested_start_date?: string  // ISO date string
  requested_end_date?: string

  // Cost
  estimated_cost?: number

  // Deadline for acceptance
  acceptance_deadline?: string  // ISO datetime string

  // Notes
  internal_notes?: string
}

/**
 * Input for updating a work order
 */
export interface UpdateWorkOrderInput {
  title?: string
  description?: string
  scope_of_work?: string

  // Status (validated by trigger)
  status?: WorkOrderStatus

  // Scheduling
  requested_start_date?: string
  requested_end_date?: string
  proposed_start_date?: string
  proposed_end_date?: string
  actual_start_date?: string
  actual_end_date?: string

  // Cost
  estimated_cost?: number
  proposed_cost?: number
  final_cost?: number

  // Notes
  internal_notes?: string
  contractor_notes?: string

  // Rejection
  rejection_reason?: string

  // Deadline
  acceptance_deadline?: string
}

// =============================================
// PDF GENERATION TYPES
// =============================================

/**
 * Data structure for PDF generation
 * Simplified and formatted for rendering
 */
export interface WorkOrderPDFData {
  // Identification
  id: string
  title: string
  description: string | null

  // Location
  building_name: string
  building_address: string
  unit_name: string
  room_name: string

  // Contractor
  company_name: string
  contact_name: string | null

  // Content
  scope_of_work: string | null

  // Dates (pre-formatted for display)
  requested_start: string | null
  requested_end: string | null
  acceptance_deadline: string | null

  // Cost
  estimated_cost: number | null

  // Generated timestamp
  generated_at: string
}

// =============================================
// API RESPONSE TYPES
// =============================================

/**
 * Response from create/update work order
 */
export interface WorkOrderResponse {
  workOrder: WorkOrder
}

/**
 * Response from get work order with relations
 */
export interface WorkOrderDetailResponse {
  workOrder: WorkOrderWithRelations
}

/**
 * Response from list work orders
 */
export interface WorkOrderListResponse {
  workOrders: WorkOrderWithRelations[]
}

/**
 * Response from send work order (create magic link)
 */
export interface WorkOrderSendResponse {
  token: string
  url: string
  expiresAt: string
  mailtoLink: string
  pdfDownloadUrl: string
}
