'use client'

import { useState, useEffect } from 'react'
import {
  formatCHF,
  formatSwissDate,
  formatPaymentMethod,
  formatPaymentStatus
} from '@/lib/costs/payment-helpers'
import type { Payment } from '@/types/database'

interface PaymentHistoryProps {
  /** Invoice ID to show payments for */
  invoiceId: string
  /** Total amount of the invoice */
  totalAmount: number
  /** Amount already paid */
  amountPaid: number
  /** Refresh trigger - increment to reload */
  refreshKey?: number
}

/**
 * PaymentHistory - Show payment records for an invoice
 *
 * Displays table of payments with date, amount, method, and reference.
 * Shows total paid vs outstanding summary.
 * For MVP: typically single payment per invoice expected.
 */
export function PaymentHistory({
  invoiceId,
  totalAmount,
  amountPaid,
  refreshKey = 0
}: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const outstanding = totalAmount - amountPaid

  useEffect(() => {
    async function fetchPayments() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/payments?invoice_id=${invoiceId}`)
        if (!response.ok) {
          throw new Error('Zahlungen konnten nicht geladen werden')
        }

        const data = await response.json()
        setPayments(data.payments ?? [])
      } catch (err) {
        console.error('Error fetching payments:', err)
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
  }, [invoiceId, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <LoadingSpinner />
        <span className="ml-2 text-gray-500 dark:text-gray-400">
          Zahlungen werden geladen...
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Keine Zahlungen erfasst
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block">
              Bezahlt
            </span>
            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
              {formatCHF(amountPaid)}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block">
              Offen
            </span>
            <span className={`text-lg font-semibold ${
              outstanding > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {formatCHF(outstanding)}
            </span>
          </div>
        </div>
        {outstanding <= 0 && (
          <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
            Vollstaendig bezahlt
          </div>
        )}
      </div>

      {/* Payments table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                Datum
              </th>
              <th className="text-right py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                Betrag
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                Methode
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                Referenz
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                  {formatSwissDate(payment.payment_date)}
                </td>
                <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-gray-100">
                  {formatCHF(payment.amount)}
                </td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                  {formatPaymentMethod(payment.payment_method)}
                </td>
                <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                  {payment.bank_reference || payment.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
          {payments.length > 1 && (
            <tfoot>
              <tr className="font-medium">
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                  Total
                </td>
                <td className="py-2 px-2 text-right text-gray-900 dark:text-gray-100">
                  {formatCHF(amountPaid)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-gray-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
