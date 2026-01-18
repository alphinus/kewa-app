/**
 * Payment helper functions for cost management
 *
 * Provides formatting, validation, and utility functions for payment operations.
 */

import type { PaymentMethod, PaymentStatus } from '@/types'

/**
 * German labels for payment methods
 */
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'Bankueberweisung',
  cash: 'Bargeld',
  check: 'Scheck',
  credit_card: 'Kreditkarte',
  debit_card: 'Debitkarte',
  other: 'Andere'
}

/**
 * German labels for payment statuses
 */
const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ausstehend',
  processing: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  failed: 'Fehlgeschlagen',
  cancelled: 'Storniert',
  refunded: 'Rueckerstattet'
}

/**
 * Format payment method for display (German)
 */
export function formatPaymentMethod(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method] ?? method
}

/**
 * Format payment status for display (German)
 */
export function formatPaymentStatus(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status] ?? status
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 * Used as default payment date
 */
export function getDefaultPaymentDate(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Validate payment amount against outstanding balance
 *
 * @param amount - Amount to pay
 * @param outstanding - Outstanding balance on invoice
 * @returns Object with valid flag and optional error message
 */
export function validatePaymentAmount(
  amount: number,
  outstanding: number
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Betrag muss groesser als 0 sein' }
  }

  if (amount > outstanding) {
    return {
      valid: false,
      error: `Betrag uebersteigt den offenen Betrag (${formatCHF(outstanding)})`
    }
  }

  return { valid: true }
}

/**
 * Format amount in Swiss Francs (CHF)
 */
export function formatCHF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return 'CHF 0.00'
  }
  return `CHF ${amount.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

/**
 * Format date for display (Swiss format: DD.MM.YYYY)
 */
export function formatSwissDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Get available payment methods for selection
 */
export function getPaymentMethodOptions(): Array<{ value: PaymentMethod; label: string }> {
  return [
    { value: 'bank_transfer', label: 'Bankueberweisung' },
    { value: 'cash', label: 'Bargeld' },
    { value: 'check', label: 'Scheck' },
    { value: 'credit_card', label: 'Kreditkarte' },
    { value: 'debit_card', label: 'Debitkarte' },
    { value: 'other', label: 'Andere' }
  ]
}
