/**
 * Cost Formatters
 *
 * Swiss formatting utilities for currency, numbers, and dates.
 * Centralized module for consistent formatting across cost-related UI.
 *
 * Phase 10-04: Project Cost Dashboard
 */

// ============================================
// CURRENCY FORMATTING
// ============================================

/**
 * Format amount as CHF currency
 * Uses Swiss locale (de-CH) for proper formatting
 *
 * @example formatCHF(1234.56) => "CHF 1'234.56"
 * @example formatCHF(null) => "-"
 */
export function formatCHF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format variance with sign prefix
 * Positive values show +, negative show -
 *
 * @example formatVariance(150) => "+CHF 150.00"
 * @example formatVariance(-50) => "-CHF 50.00"
 * @example formatVariance(0) => "CHF 0.00"
 */
export function formatVariance(variance: number | null | undefined): string {
  if (variance === null || variance === undefined) return '-'
  const formatted = formatCHF(Math.abs(variance))
  if (variance > 0) return `+${formatted}`
  if (variance < 0) return `-${formatted.replace('CHF', 'CHF ')}`
  return formatted
}

// ============================================
// DATE FORMATTING
// ============================================

/**
 * Format date in Swiss format (DD.MM.YYYY)
 * Uses date-fns locale de-CH style
 *
 * @example formatSwissDate("2026-01-18") => "18.01.2026"
 * @example formatSwissDate(new Date()) => "18.01.2026"
 * @example formatSwissDate(null) => "-"
 */
export function formatSwissDate(
  date: string | Date | null | undefined
): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Format date with time in Swiss format (DD.MM.YYYY HH:MM)
 *
 * @example formatSwissDateTime("2026-01-18T14:30:00") => "18.01.2026 14:30"
 */
export function formatSwissDateTime(
  date: string | Date | null | undefined
): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format number with Swiss locale (comma as decimal separator, apostrophe as thousands)
 * For export/CSV purposes where currency symbol is not needed
 *
 * @example formatSwissNumber(1234.56) => "1'234,56"
 * @example formatSwissNumber(null) => ""
 */
export function formatSwissNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return ''
  // Use toFixed for consistent decimals, then convert to Swiss format
  return num
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, "'")
}

/**
 * Format percentage with 1 decimal place
 *
 * @example formatPercentage(0.077) => "7.7%"
 * @example formatPercentage(0.5) => "50.0%"
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${(value * 100).toFixed(1)}%`
}

// ============================================
// STATUS TRANSLATION
// ============================================

/**
 * Translate work order status to German
 */
export function translateWorkOrderStatus(status: string): string {
  const translations: Record<string, string> = {
    draft: 'Entwurf',
    sent: 'Gesendet',
    viewed: 'Angesehen',
    accepted: 'Angenommen',
    rejected: 'Abgelehnt',
    counter_offer: 'Gegenofferte',
    in_progress: 'In Arbeit',
    done: 'Abgeschlossen',
    verified: 'Geprueft',
    cancelled: 'Storniert',
  }
  return translations[status] ?? status
}

/**
 * Translate invoice status to German
 */
export function translateInvoiceStatus(status: string): string {
  const translations: Record<string, string> = {
    received: 'Erhalten',
    under_review: 'In Pruefung',
    approved: 'Freigegeben',
    disputed: 'Beanstandet',
    partially_paid: 'Teilweise bezahlt',
    paid: 'Bezahlt',
    cancelled: 'Storniert',
  }
  return translations[status] ?? status
}

/**
 * Get status badge color classes for work order status
 */
export function getWorkOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    counter_offer: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-purple-100 text-purple-800',
    done: 'bg-green-100 text-green-800',
    verified: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}

/**
 * Get status badge color classes for invoice status
 */
export function getInvoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    received: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800',
    partially_paid: 'bg-orange-100 text-orange-800',
    paid: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}
