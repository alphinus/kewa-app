/**
 * CSV Export Utilities for Cost & Finance
 *
 * Provides Swiss-formatted CSV generation for invoices and expenses.
 * Uses Papa Parse for robust CSV handling with:
 * - Semicolon delimiter (Swiss/German Excel default)
 * - UTF-8 BOM for Excel compatibility
 * - DD.MM.YYYY date format
 * - Comma as decimal separator
 *
 * Phase 10-05: CSV Export for Accounting (COST-06)
 */

import Papa from 'papaparse'

// ============================================
// SWISS FORMATTING HELPERS
// ============================================

/**
 * Format date in Swiss format (DD.MM.YYYY)
 */
export function formatSwissDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Format number with comma as decimal separator (Swiss style)
 */
export function formatSwissNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return ''
  return num.toFixed(2).replace('.', ',')
}

/**
 * Parse Swiss date back to Date object (for sorting)
 */
export function parseSwissDate(dateStr: string): Date {
  if (!dateStr) return new Date(0)
  const parts = dateStr.split('.')
  if (parts.length !== 3) return new Date(0)
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const year = parseInt(parts[2], 10)
  return new Date(year, month, day)
}

// ============================================
// STATUS TRANSLATIONS (German)
// ============================================

/**
 * Invoice status translations
 */
const INVOICE_STATUS_TRANSLATIONS: Record<string, string> = {
  received: 'erhalten',
  under_review: 'in Pruefung',
  approved: 'freigegeben',
  disputed: 'beanstandet',
  partially_paid: 'teilweise bezahlt',
  paid: 'bezahlt',
  cancelled: 'storniert',
}

/**
 * Translate invoice status to German
 */
export function translateInvoiceStatus(status: string): string {
  return INVOICE_STATUS_TRANSLATIONS[status] ?? status
}

/**
 * Expense category translations
 */
const EXPENSE_CATEGORY_TRANSLATIONS: Record<string, string> = {
  material: 'Material',
  labor: 'Arbeit',
  equipment_rental: 'Geraetemiete',
  travel: 'Reise/Spesen',
  permits: 'Bewilligungen',
  disposal: 'Entsorgung',
  utilities: 'Nebenkosten',
  other: 'Sonstiges',
}

/**
 * Translate expense category to German
 */
export function translateExpenseCategory(category: string): string {
  return EXPENSE_CATEGORY_TRANSLATIONS[category] ?? category
}

// ============================================
// EXPORT TYPES
// ============================================

/**
 * Export type selection
 */
export type ExportType = 'invoices' | 'expenses' | 'all'

/**
 * Export request parameters
 */
export interface ExportRequest {
  type: ExportType
  projectId?: string
  dateFrom?: string
  dateTo?: string
  status?: string[]
}

/**
 * Row structure for CSV export (German headers)
 */
export interface ExportRow {
  Datum: string
  Typ: string
  Belegnummer: string
  Partner: string
  Projekt: string
  Netto: string
  MwSt: string
  Brutto: string
  Status: string
  Bezahlt: string
}

/**
 * German column headers for export
 */
export const EXPORT_COLUMNS: (keyof ExportRow)[] = [
  'Datum',
  'Typ',
  'Belegnummer',
  'Partner',
  'Projekt',
  'Netto',
  'MwSt',
  'Brutto',
  'Status',
  'Bezahlt',
]

// ============================================
// CSV GENERATION
// ============================================

/**
 * Options for CSV generation
 */
export interface CSVOptions {
  delimiter?: string
  quotes?: boolean
  header?: boolean
}

/**
 * Generate CSV string from export rows
 *
 * @param rows - Array of ExportRow objects
 * @param options - CSV generation options
 * @returns CSV string with Swiss formatting
 */
export function generateCSV(
  rows: ExportRow[],
  options: CSVOptions = {}
): string {
  const {
    delimiter = ';', // Swiss/German Excel default
    quotes = true,
    header = true,
  } = options

  return Papa.unparse(rows, {
    delimiter,
    quotes,
    header,
    columns: EXPORT_COLUMNS,
  })
}

/**
 * Add UTF-8 BOM for Excel compatibility
 *
 * @param csvContent - CSV string
 * @returns CSV string with BOM prepended
 */
export function addUTF8BOM(csvContent: string): string {
  return '\ufeff' + csvContent
}

/**
 * Generate export filename with Swiss date
 *
 * @param type - Export type for filename
 * @returns Filename string
 */
export function generateExportFilename(type: ExportType): string {
  const dateStr = formatSwissDate(new Date())
  const typeLabels: Record<ExportType, string> = {
    invoices: 'rechnungen',
    expenses: 'ausgaben',
    all: 'kosten',
  }
  return `${typeLabels[type]}-export-${dateStr}.csv`
}

// ============================================
// ROW MAPPERS
// ============================================

/**
 * Invoice data for export mapping
 */
export interface InvoiceExportData {
  invoice_number: string
  invoice_date: string
  amount: number
  tax_amount: number | null
  total_amount: number | null
  status: string
  paid_at: string | null
  partner?: { company_name: string } | null
  project?: { name: string } | null
}

/**
 * Map invoice to export row
 */
export function mapInvoiceToExportRow(invoice: InvoiceExportData): ExportRow {
  return {
    Datum: formatSwissDate(invoice.invoice_date),
    Typ: 'Rechnung',
    Belegnummer: invoice.invoice_number,
    Partner: invoice.partner?.company_name ?? '',
    Projekt: invoice.project?.name ?? '',
    Netto: formatSwissNumber(invoice.amount),
    MwSt: formatSwissNumber(invoice.tax_amount),
    Brutto: formatSwissNumber(invoice.total_amount),
    Status: translateInvoiceStatus(invoice.status),
    Bezahlt: formatSwissDate(invoice.paid_at),
  }
}

/**
 * Expense data for export mapping
 */
export interface ExpenseExportData {
  receipt_number: string | null
  paid_at: string | null
  amount: number
  vendor_name: string | null
  category: string
  project?: { name: string } | null
}

/**
 * Map expense to export row
 */
export function mapExpenseToExportRow(expense: ExpenseExportData): ExportRow {
  return {
    Datum: formatSwissDate(expense.paid_at),
    Typ: 'Ausgabe',
    Belegnummer: expense.receipt_number ?? '',
    Partner: expense.vendor_name ?? '',
    Projekt: expense.project?.name ?? '',
    Netto: formatSwissNumber(expense.amount),
    MwSt: '', // Expenses don't have separate VAT tracking
    Brutto: formatSwissNumber(expense.amount),
    Status: translateExpenseCategory(expense.category),
    Bezahlt: formatSwissDate(expense.paid_at),
  }
}

/**
 * Sort export rows by date descending (newest first)
 */
export function sortExportRowsByDate(rows: ExportRow[]): ExportRow[] {
  return [...rows].sort((a, b) => {
    const dateA = parseSwissDate(a.Datum)
    const dateB = parseSwissDate(b.Datum)
    return dateB.getTime() - dateA.getTime()
  })
}
