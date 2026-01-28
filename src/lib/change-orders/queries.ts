/**
 * Change Order Query Helpers
 *
 * Helper functions for change order calculations, formatting, and utilities.
 * Separated from API routes to allow reuse in components.
 *
 * Phase 21-01: Change Order CRUD
 */

import type { ChangeOrderLineItem } from '@/types/change-orders'

// ============================================
// CALCULATION HELPERS
// ============================================

/**
 * Calculate total from line items (preserves sign for credits)
 */
export function calculateLineItemsTotal(items: ChangeOrderLineItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0)
}

/**
 * Create a new line item with calculated total
 */
export function createLineItem(
  partial: Omit<ChangeOrderLineItem, 'id' | 'total'>
): ChangeOrderLineItem {
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
  item: ChangeOrderLineItem,
  updates: Partial<Omit<ChangeOrderLineItem, 'id' | 'total'>>
): ChangeOrderLineItem {
  const updated = { ...item, ...updates }
  return {
    ...updated,
    total: updated.quantity * updated.unit_price,
  }
}

// ============================================
// SELECT QUERY CONSTANT
// ============================================

/**
 * Select query with work_order and project joins
 */
export const CHANGE_ORDER_SELECT = `
  *,
  work_order:work_orders!work_order_id (
    id,
    title,
    wo_number
  ),
  project:work_orders!work_order_id (
    project:renovation_projects (
      id,
      name
    )
  )
`

// ============================================
// FORMATTING HELPERS
// ============================================

/**
 * Format CO number for display
 * CO numbers are already formatted as CO-YYYY-NNNNN
 */
export function formatCONumber(coNumber: string): string {
  return coNumber
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
export function createEmptyLineItem(): ChangeOrderLineItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unit: 'Stueck',
    unit_price: 0,
    total: 0,
  }
}
