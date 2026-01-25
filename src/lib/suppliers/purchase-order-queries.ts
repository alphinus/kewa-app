/**
 * Purchase Order Query Helpers
 *
 * Helper functions for purchase order calculations, formatting, and utilities.
 * Separated from API routes to allow reuse in components.
 *
 * Phase 19-02: Purchase Order CRUD with Status Workflow
 */

// ============================================
// TYPES
// ============================================

export interface PurchaseOrderLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
}

// ============================================
// CALCULATION HELPERS
// ============================================

/**
 * Calculate total from line items
 */
export function calculateLineItemsTotal(items: PurchaseOrderLineItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0)
}

/**
 * Create a new line item with calculated total
 */
export function createLineItem(
  partial: Omit<PurchaseOrderLineItem, 'id' | 'total'>
): PurchaseOrderLineItem {
  return {
    id: crypto.randomUUID(),
    ...partial,
    total: partial.quantity * partial.unit_price,
  }
}

/**
 * Update line item with recalculated total
 */
export function updateLineItem(
  item: PurchaseOrderLineItem,
  updates: Partial<Omit<PurchaseOrderLineItem, 'id' | 'total'>>
): PurchaseOrderLineItem {
  const updated = { ...item, ...updates }
  return {
    ...updated,
    total: updated.quantity * updated.unit_price,
  }
}

// ============================================
// FORMATTING HELPERS
// ============================================

/**
 * Format order number for display
 * Order numbers are already formatted as PO-YYYY-NNNNN
 */
export function formatOrderNumber(orderNumber: string): string {
  return orderNumber
}

/**
 * Format CHF currency for display
 */
export function formatCHF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(amount)
}

/**
 * Format date for Swiss display (DD.MM.YYYY)
 */
export function formatSwissDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ============================================
// DEFAULT VALUES
// ============================================

/**
 * Default units for line items
 */
export const DEFAULT_UNITS = [
  'Stueck',
  'Stunden',
  'Meter',
  'm2',
  'm3',
  'kg',
  'Liter',
  'Pauschal',
] as const

export type DefaultUnit = (typeof DEFAULT_UNITS)[number]

/**
 * Create empty line item for forms
 */
export function createEmptyLineItem(): PurchaseOrderLineItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unit: 'Stueck',
    unit_price: 0,
    total: 0,
  }
}
