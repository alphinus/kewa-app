/**
 * Expense Constants
 *
 * Shared constants for expense management components and API routes.
 * Includes categories, payment methods, and German labels.
 *
 * Phase 10-02: Manual Expense Entry with Receipt Upload
 */

import type { ExpenseCategory, ExpensePaymentMethod } from '@/types'

// ============================================
// EXPENSE CATEGORIES (COST-02)
// ============================================

export interface ExpenseCategoryOption {
  value: ExpenseCategory
  label: string
  description: string
}

/**
 * Expense categories with German labels.
 * Based on expense_category enum from migration 019_expense.sql
 */
export const EXPENSE_CATEGORIES: readonly ExpenseCategoryOption[] = [
  {
    value: 'material',
    label: 'Material',
    description: 'Baumaterial, Werkzeuge, Verbrauchsmaterial',
  },
  {
    value: 'labor',
    label: 'Arbeit',
    description: 'Arbeitskosten, Stundenloehne',
  },
  {
    value: 'equipment_rental',
    label: 'Geraetemiete',
    description: 'Mietgeraete, Baumaschinen',
  },
  {
    value: 'travel',
    label: 'Reise/Spesen',
    description: 'Fahrtkosten, Verpflegung, Unterkunft',
  },
  {
    value: 'permits',
    label: 'Bewilligungen',
    description: 'Baubewilligungen, Gebuehren, Inspektionen',
  },
  {
    value: 'disposal',
    label: 'Entsorgung',
    description: 'Abfall, Bauschutt, Recycling',
  },
  {
    value: 'utilities',
    label: 'Nebenkosten',
    description: 'Strom, Wasser, Heizung waehrend Bauphasen',
  },
  {
    value: 'other',
    label: 'Sonstiges',
    description: 'Sonstige Ausgaben',
  },
] as const

/**
 * Get category option by value
 */
export function getCategoryByValue(
  value: ExpenseCategory
): ExpenseCategoryOption | undefined {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)
}

/**
 * Format expense category to German label
 */
export function formatExpenseCategory(category: ExpenseCategory): string {
  const option = getCategoryByValue(category)
  return option?.label ?? category
}

// ============================================
// EXPENSE PAYMENT METHODS
// ============================================

export interface PaymentMethodOption {
  value: ExpensePaymentMethod
  label: string
  description: string
}

/**
 * Expense payment methods with German labels.
 * Based on expense_payment_method enum from migration 019_expense.sql
 */
export const EXPENSE_PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  {
    value: 'cash',
    label: 'Bargeld',
    description: 'Barzahlung vor Ort',
  },
  {
    value: 'petty_cash',
    label: 'Handkasse',
    description: 'Zahlung aus Firmen-Handkasse',
  },
  {
    value: 'company_card',
    label: 'Firmenkarte',
    description: 'Firmenkreditkarte oder Debitkarte',
  },
  {
    value: 'personal_reimbursement',
    label: 'Privatauslagen',
    description: 'Private Vorauslage, Erstattung folgt',
  },
] as const

/**
 * Get payment method option by value
 */
export function getPaymentMethodByValue(
  value: ExpensePaymentMethod
): PaymentMethodOption | undefined {
  return EXPENSE_PAYMENT_METHODS.find((pm) => pm.value === value)
}

/**
 * Format payment method to German label
 */
export function formatPaymentMethod(method: ExpensePaymentMethod): string {
  const option = getPaymentMethodByValue(method)
  return option?.label ?? method
}

// ============================================
// CATEGORY COLORS FOR UI
// ============================================

/**
 * Colors for category badges
 */
export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  material: 'bg-blue-100 text-blue-800',
  labor: 'bg-green-100 text-green-800',
  equipment_rental: 'bg-purple-100 text-purple-800',
  travel: 'bg-orange-100 text-orange-800',
  permits: 'bg-yellow-100 text-yellow-800',
  disposal: 'bg-gray-100 text-gray-800',
  utilities: 'bg-cyan-100 text-cyan-800',
  other: 'bg-slate-100 text-slate-800',
}

/**
 * Get color classes for a category
 */
export function getCategoryColor(category: ExpenseCategory): string {
  return EXPENSE_CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-800'
}

// ============================================
// CURRENCY FORMATTING
// ============================================

/**
 * Format amount as CHF currency
 */
export function formatCHF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '-'
  }
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date in Swiss format (DD.MM.YYYY)
 */
export function formatSwissDate(
  date: string | Date | null | undefined
): string {
  if (!date) return '-'
  const d = new Date(date)
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}
