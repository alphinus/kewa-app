/**
 * Supplier Management Types
 *
 * Types for purchase orders and deliveries.
 * Phase: 19-supplier-core
 */

// =============================================
// STATUS ENUMS
// =============================================

/**
 * Purchase order status workflow
 * Valid transitions: draft->ordered->confirmed->delivered->invoiced
 * Cancellation: draft/ordered/confirmed can cancel
 */
export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'confirmed'
  | 'delivered'
  | 'invoiced'
  | 'cancelled'

// =============================================
// LINE ITEM TYPES
// =============================================

/**
 * Line item structure for purchase orders (matches offers pattern)
 */
export interface PurchaseOrderLineItem {
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
 * Purchase order entity matching database schema
 */
export interface PurchaseOrder {
  id: string
  supplier_id: string
  order_number: string
  status: PurchaseOrderStatus
  line_items: PurchaseOrderLineItem[]
  total_amount: number
  currency: string
  expected_delivery_date: string | null
  notes: string | null
  ordered_at: string | null
  confirmed_at: string | null
  delivered_at: string | null
  invoiced_at: string | null
  cancelled_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  supplier?: {
    id: string
    company_name: string
  }
}

/**
 * Delivery entity matching database schema
 */
export interface Delivery {
  id: string
  purchase_order_id: string
  delivery_date: string
  delivery_note_number: string | null
  quantity_ordered: number
  quantity_received: number
  quantity_unit: string
  has_variance: boolean
  variance_note: string | null
  property_id: string | null
  building_id: string | null
  invoice_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  purchase_order?: PurchaseOrder
  property?: { id: string; name: string }
  building?: { id: string; name: string }
  invoice?: { id: string; invoice_number: string }
}

// =============================================
// API INPUT TYPES
// =============================================

/**
 * Input for creating a purchase order
 */
export interface CreatePurchaseOrderInput {
  supplier_id: string
  line_items: PurchaseOrderLineItem[]
  expected_delivery_date?: string
  notes?: string
  status?: 'draft' | 'ordered'
}

/**
 * Input for updating a purchase order
 */
export interface UpdatePurchaseOrderInput {
  line_items?: PurchaseOrderLineItem[]
  expected_delivery_date?: string | null
  notes?: string | null
  status?: PurchaseOrderStatus
}

/**
 * Input for creating a delivery
 */
export interface CreateDeliveryInput {
  purchase_order_id: string
  delivery_date: string
  delivery_note_number?: string
  quantity_ordered: number
  quantity_received: number
  quantity_unit: string
  property_id: string
  building_id?: string
  variance_note?: string
  notes?: string
}

/**
 * Input for updating a delivery
 */
export interface UpdateDeliveryInput {
  delivery_date?: string
  delivery_note_number?: string | null
  quantity_ordered?: number
  quantity_received?: number
  quantity_unit?: string
  property_id?: string | null
  building_id?: string | null
  invoice_id?: string | null
  variance_note?: string | null
  notes?: string | null
}

// =============================================
// API RESPONSE TYPES
// =============================================

/**
 * Response for GET /api/suppliers
 */
export interface SuppliersResponse {
  suppliers: Array<{
    id: string
    partner_type: 'supplier'
    company_name: string
    contact_name: string | null
    email: string | null
    phone: string | null
    address: string | null
    is_active: boolean
    notes: string | null
    created_at: string
    updated_at: string
  }>
  total: number | null
  limit: number
  offset: number
}

/**
 * Response for purchase order operations
 */
export interface PurchaseOrderResponse {
  purchase_order: PurchaseOrder
}

/**
 * Response for listing purchase orders
 */
export interface PurchaseOrdersResponse {
  purchase_orders: PurchaseOrder[]
  total: number | null
  limit: number
  offset: number
}

/**
 * Response for delivery operations
 */
export interface DeliveryResponse {
  delivery: Delivery
}

/**
 * Response for listing deliveries
 */
export interface DeliveriesResponse {
  deliveries: Delivery[]
  total: number | null
  limit: number
  offset: number
}
