/**
 * Change Order Types
 *
 * Types for change order management with versioning and approval workflows.
 * Phase: 21-change-orders
 */

// =============================================
// STATUS ENUMS
// =============================================

/**
 * Change order status workflow
 * Valid transitions:
 * - draft -> submitted, cancelled
 * - submitted -> under_review, cancelled
 * - under_review -> approved, rejected, submitted, cancelled
 * - approved -> cancelled
 * - rejected, cancelled -> terminal states
 */
export type ChangeOrderStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'

/**
 * Change order reason categories
 */
export type ChangeOrderReason =
  | 'owner_request'
  | 'unforeseen_conditions'
  | 'design_error'
  | 'site_conditions'
  | 'regulatory_requirement'
  | 'other'

/**
 * Creator type (who initiated the CO)
 */
export type CreatorType = 'internal' | 'contractor'

// =============================================
// LINE ITEM TYPES
// =============================================

/**
 * Line item structure for change orders (same as purchase orders)
 * Total can be positive (additions) or negative (credits/scope reductions)
 */
export interface ChangeOrderLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
}

// =============================================
// ENTITY TYPES
// =============================================

/**
 * Change order entity matching database schema
 */
export interface ChangeOrder {
  id: string
  co_number: string
  work_order_id: string
  related_work_order_ids: string[]
  version: number
  description: string
  reason_category: ChangeOrderReason
  reason_details: string | null
  line_items: ChangeOrderLineItem[]
  total_amount: number
  schedule_impact_days: number
  status: ChangeOrderStatus
  created_by: string | null
  creator_type: CreatorType
  current_approver_id: string | null
  show_line_items_to_client: boolean
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  cancelled_at: string | null
  cancelled_reason: string | null
  created_at: string
  updated_at: string
  // Joined fields
  work_order?: {
    id: string
    title: string
    wo_number: string
  }
  project?: {
    id: string
    name: string
  }
}

/**
 * Change order version history entity
 */
export interface ChangeOrderVersion {
  version_id: string
  change_order_id: string
  version: number
  description: string
  line_items: ChangeOrderLineItem[]
  total_amount: number | null
  schedule_impact_days: number | null
  revised_by: string | null
  revised_at: string
  revision_reason: string | null
}

/**
 * Change order photo attachment entity
 */
export interface ChangeOrderPhoto {
  id: string
  change_order_id: string
  storage_path: string
  filename: string
  file_size: number | null
  mime_type: string | null
  caption: string | null
  uploaded_by: string | null
  uploaded_at: string
}

// =============================================
// API INPUT TYPES
// =============================================

/**
 * Input for creating a change order
 */
export interface CreateChangeOrderInput {
  work_order_id: string
  related_work_order_ids?: string[]
  description: string
  reason_category: ChangeOrderReason
  reason_details?: string
  line_items: ChangeOrderLineItem[]
  schedule_impact_days?: number
  show_line_items_to_client?: boolean
  status?: 'draft' | 'submitted'
}

/**
 * Input for updating a change order
 */
export interface UpdateChangeOrderInput {
  description?: string
  reason_category?: ChangeOrderReason
  reason_details?: string | null
  line_items?: ChangeOrderLineItem[]
  schedule_impact_days?: number
  show_line_items_to_client?: boolean
  status?: ChangeOrderStatus
  cancelled_reason?: string
}

// =============================================
// API RESPONSE TYPES
// =============================================

/**
 * Response for GET /api/change-orders/[id]
 */
export interface ChangeOrderResponse {
  change_order: ChangeOrder
  versions?: ChangeOrderVersion[]
}

/**
 * Response for GET /api/change-orders
 */
export interface ChangeOrdersResponse {
  change_orders: ChangeOrder[]
  total: number | null
  limit: number
  offset: number
}
