/**
 * Purchase Order Status Utilities
 *
 * Client-safe constants and utilities for purchase order status management.
 * Includes German labels, color codes, and valid status transitions.
 *
 * Phase 19-02: Purchase Order CRUD with Status Workflow
 */

// ============================================
// STATUS TYPE
// ============================================

export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'confirmed'
  | 'delivered'
  | 'invoiced'
  | 'cancelled'

// ============================================
// STATUS LABELS (German)
// ============================================

/**
 * Get German display label for purchase order status
 */
export function getPurchaseOrderStatusLabel(status: PurchaseOrderStatus): string {
  const labels: Record<PurchaseOrderStatus, string> = {
    draft: 'Entwurf',
    ordered: 'Bestellt',
    confirmed: 'Bestaetigt',
    delivered: 'Geliefert',
    invoiced: 'Verrechnet',
    cancelled: 'Storniert',
  }
  return labels[status] ?? status
}

// ============================================
// STATUS COLORS (Tailwind classes)
// ============================================

/**
 * Get Tailwind CSS classes for status badge
 */
export function getPurchaseOrderStatusColor(status: PurchaseOrderStatus): string {
  const colors: Record<PurchaseOrderStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    ordered: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    invoiced: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-800',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}

// ============================================
// STATUS TRANSITIONS
// ============================================

/**
 * Valid status transitions (mirrors database trigger)
 *
 * Workflow:
 * - draft -> ordered (place order) or cancelled
 * - ordered -> confirmed (supplier confirms) or cancelled
 * - confirmed -> delivered (goods received) or cancelled
 * - delivered -> invoiced (matched with invoice)
 * - invoiced, cancelled -> terminal states
 */
export const VALID_PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ['ordered', 'cancelled'],
  ordered: ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: ['invoiced'],
  invoiced: [],
  cancelled: [],
}

/**
 * Check if transition from current to target status is valid
 */
export function canTransitionTo(
  current: PurchaseOrderStatus,
  target: PurchaseOrderStatus
): boolean {
  return VALID_PO_TRANSITIONS[current]?.includes(target) ?? false
}

/**
 * Get available next actions for a status
 */
export function getNextActions(status: PurchaseOrderStatus): PurchaseOrderStatus[] {
  return VALID_PO_TRANSITIONS[status] ?? []
}

// ============================================
// STATUS OPTIONS FOR FILTERS
// ============================================

export interface PurchaseOrderStatusOption {
  value: PurchaseOrderStatus | ''
  label: string
}

/**
 * All status options with German labels (for filter dropdowns)
 */
export const PURCHASE_ORDER_STATUS_OPTIONS: readonly PurchaseOrderStatusOption[] = [
  { value: '', label: 'Alle Status' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'ordered', label: 'Bestellt' },
  { value: 'confirmed', label: 'Bestaetigt' },
  { value: 'delivered', label: 'Geliefert' },
  { value: 'invoiced', label: 'Verrechnet' },
  { value: 'cancelled', label: 'Storniert' },
] as const
