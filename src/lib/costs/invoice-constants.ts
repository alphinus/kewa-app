/**
 * Invoice Constants
 *
 * Client-safe constants and formatting utilities for invoices.
 * Separated from invoice-queries.ts to allow use in client components.
 *
 * Phase 10-02: Fix for client component import issue
 * Phase 12.2-01: Added DEFAULT_TAX_RATE and INVOICE_STATUSES
 */

import type { InvoiceStatus } from '@/types'

// ============================================
// TAX CONSTANTS
// ============================================

/**
 * Default Swiss VAT rate (updated from 7.7% to 8.0% in 2024)
 */
export const DEFAULT_TAX_RATE = 8.0

// ============================================
// STATUS OPTIONS
// ============================================

/**
 * All invoice statuses as a readonly array
 */
export const INVOICE_STATUSES: readonly InvoiceStatus[] = [
  'draft',
  'received',
  'under_review',
  'approved',
  'disputed',
  'partially_paid',
  'paid',
  'cancelled',
] as const

export interface InvoiceStatusOption {
  value: InvoiceStatus
  label: string
}

/**
 * Invoice status options with German labels
 */
export const INVOICE_STATUS_OPTIONS: readonly InvoiceStatusOption[] = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'received', label: 'Erhalten' },
  { value: 'under_review', label: 'In Pruefung' },
  { value: 'approved', label: 'Freigegeben' },
  { value: 'disputed', label: 'Beanstandet' },
  { value: 'partially_paid', label: 'Teilweise bezahlt' },
  { value: 'paid', label: 'Bezahlt' },
  { value: 'cancelled', label: 'Storniert' },
] as const

// ============================================
// FORMATTING FUNCTIONS
// ============================================

/**
 * Format CHF currency for display
 */
export function formatCHF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF'
  }).format(amount)
}

/**
 * Format date for Swiss display (DD.MM.YYYY)
 */
export function formatSwissDate(date: string | Date | null): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Get invoice status display text (German)
 */
export function getInvoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Entwurf',
    received: 'Erhalten',
    under_review: 'In Pruefung',
    approved: 'Freigegeben',
    disputed: 'Beanstandet',
    partially_paid: 'Teilweise bezahlt',
    paid: 'Bezahlt',
    cancelled: 'Storniert'
  }
  return labels[status] ?? status
}

/**
 * Get status badge color class
 */
export function getInvoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    received: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800',
    partially_paid: 'bg-orange-100 text-orange-800',
    paid: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-500'
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}
