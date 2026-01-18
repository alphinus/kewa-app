'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { PaymentModal } from './PaymentModal'
import { PaymentHistory } from './PaymentHistory'
import {
  formatCHF,
  formatSwissDate
} from '@/lib/costs/payment-helpers'
import type { Invoice } from '@/types/database'
import type { InvoiceStatus } from '@/types'

interface InvoiceWithPartner extends Invoice {
  partner?: {
    id: string
    company_name: string
    contact_name?: string | null
    email?: string | null
    phone?: string | null
  } | null
  work_order?: {
    id: string
    title: string
  } | null
  project?: {
    id: string
    name: string
  } | null
}

interface InvoiceDetailProps {
  /** Invoice to display */
  invoice: InvoiceWithPartner
  /** Callback when invoice is updated (e.g., after payment) */
  onUpdate?: () => void
}

/**
 * German labels for invoice status
 */
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  received: 'Erhalten',
  under_review: 'In Pruefung',
  approved: 'Freigegeben',
  disputed: 'Beanstandet',
  partially_paid: 'Teilweise bezahlt',
  paid: 'Bezahlt',
  cancelled: 'Storniert'
}

/**
 * Status badge colors
 */
const STATUS_COLORS: Record<InvoiceStatus, string> = {
  received: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  partially_paid: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
}

/**
 * InvoiceDetail - Display invoice information with payment functionality
 *
 * Shows invoice details, status, amounts, and integrates:
 * - PaymentModal for "Als bezahlt markieren" action
 * - PaymentHistory for paid/partially_paid invoices
 */
export function InvoiceDetail({ invoice, onUpdate }: InvoiceDetailProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const canPay = invoice.status === 'approved'
  const hasPayments = (invoice.amount_paid ?? 0) > 0 || invoice.status === 'paid' || invoice.status === 'partially_paid'
  const outstanding = invoice.amount_outstanding ?? (invoice.total_amount ?? 0) - (invoice.amount_paid ?? 0)

  /**
   * Handle successful payment
   */
  const handlePaymentSuccess = useCallback(() => {
    setShowPaymentModal(false)
    setRefreshKey((prev) => prev + 1)
    onUpdate?.()
  }, [onUpdate])

  return (
    <div className="space-y-6">
      {/* Header with status badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Rechnung {invoice.invoice_number}
          </h2>
          {invoice.title && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {invoice.title}
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            STATUS_COLORS[invoice.status]
          }`}
        >
          {STATUS_LABELS[invoice.status]}
        </span>
      </div>

      {/* Invoice details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Partner & Project info */}
        <div className="space-y-4">
          {invoice.partner && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Partner
              </h3>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {invoice.partner.company_name}
              </p>
              {invoice.partner.contact_name && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {invoice.partner.contact_name}
                </p>
              )}
              {invoice.partner.email && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {invoice.partner.email}
                </p>
              )}
            </div>
          )}

          {invoice.project && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Projekt
              </h3>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {invoice.project.name}
              </p>
            </div>
          )}

          {invoice.work_order && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Arbeitsauftrag
              </h3>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {invoice.work_order.title}
              </p>
            </div>
          )}
        </div>

        {/* Right column: Amounts & Dates */}
        <div className="space-y-4">
          {/* Amounts */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Betraege
            </h3>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Netto</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCHF(invoice.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                MwSt ({invoice.tax_rate}%)
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCHF(invoice.tax_amount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Total
              </span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {formatCHF(invoice.total_amount)}
              </span>
            </div>
            {(invoice.amount_paid ?? 0) > 0 && (
              <>
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Bezahlt</span>
                  <span className="font-medium">
                    {formatCHF(invoice.amount_paid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Offen
                  </span>
                  <span className={`font-bold ${
                    outstanding > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {formatCHF(outstanding)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Dates */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Daten
            </h3>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Rechnungsdatum</span>
              <span className="text-gray-900 dark:text-gray-100">
                {formatSwissDate(invoice.invoice_date)}
              </span>
            </div>
            {invoice.due_date && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Faellig</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatSwissDate(invoice.due_date)}
                </span>
              </div>
            )}
            {invoice.approved_at && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Freigegeben</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatSwissDate(invoice.approved_at)}
                </span>
              </div>
            )}
            {invoice.paid_at && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Bezahlt am</span>
                <span>{formatSwissDate(invoice.paid_at)}</span>
              </div>
            )}
          </div>

          {/* Variance tracking */}
          {invoice.offer_amount !== null && invoice.offer_amount !== undefined && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Offerten-Vergleich
              </h3>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Offerte</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatCHF(invoice.offer_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rechnung</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatCHF(invoice.total_amount)}
                </span>
              </div>
              {invoice.variance_amount !== null && invoice.variance_amount !== undefined && (
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <span className="text-gray-600 dark:text-gray-400">Differenz</span>
                  <span className={`font-medium ${
                    invoice.variance_amount > 0
                      ? 'text-red-600 dark:text-red-400'
                      : invoice.variance_amount < 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {invoice.variance_amount > 0 ? '+' : ''}
                    {formatCHF(invoice.variance_amount)}
                  </span>
                </div>
              )}
              {invoice.variance_reason && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {invoice.variance_reason}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {invoice.description && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Beschreibung
          </h3>
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {invoice.description}
          </p>
        </div>
      )}

      {/* Internal notes */}
      {invoice.internal_notes && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
            Interne Notizen
          </h3>
          <p className="text-amber-900 dark:text-amber-200 whitespace-pre-wrap">
            {invoice.internal_notes}
          </p>
        </div>
      )}

      {/* Payment action button */}
      {canPay && outstanding > 0 && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowPaymentModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            Als bezahlt markieren
          </Button>
        </div>
      )}

      {/* Disabled state hint when not approved */}
      {invoice.status !== 'approved' && invoice.status !== 'paid' && invoice.status !== 'partially_paid' && (
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Die Rechnung muss zuerst freigegeben werden, bevor eine Zahlung erfasst werden kann.
          </p>
        </div>
      )}

      {/* Payment history */}
      {hasPayments && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Zahlungsverlauf
          </h3>
          <PaymentHistory
            invoiceId={invoice.id}
            totalAmount={invoice.total_amount ?? 0}
            amountPaid={invoice.amount_paid ?? 0}
            refreshKey={refreshKey}
          />
        </div>
      )}

      {/* Payment modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}
