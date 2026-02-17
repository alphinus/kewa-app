'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  formatCHF,
  formatSwissDate,
  getDefaultPaymentDate,
  getPaymentMethodOptions,
  validatePaymentAmount
} from '@/lib/costs/payment-helpers'
import type { Invoice } from '@/types/database'
import type { PaymentMethod } from '@/types'

interface InvoiceWithPartner extends Invoice {
  partner?: {
    id: string
    company_name: string
  } | null
}

interface PaymentModalProps {
  /** Invoice to pay */
  invoice: InvoiceWithPartner
  /** Callback when modal is closed */
  onClose: () => void
  /** Callback when payment is successfully created */
  onSuccess: () => void
}

/**
 * PaymentModal - Mark invoice as paid
 *
 * Shows invoice summary and allows recording a payment.
 * Pre-fills amount with outstanding balance and date with today.
 * Default payment method is bank transfer.
 */
export function PaymentModal({ invoice, onClose, onSuccess }: PaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState(
    (invoice.amount_outstanding ?? invoice.total_amount ?? 0).toString()
  )
  const [paymentDate, setPaymentDate] = useState(getDefaultPaymentDate())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [notes, setNotes] = useState('')

  const modalRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  const outstanding = invoice.amount_outstanding ?? invoice.total_amount ?? 0
  const paymentMethodOptions = getPaymentMethodOptions()

  // Focus trap and escape key handling
  useEffect(() => {
    cancelButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement?.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleFocusTrap)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleFocusTrap)
      document.body.style.overflow = ''
    }
  }, [loading, onClose])

  /**
   * Handle payment submission
   */
  const handleSubmit = async () => {
    setError(null)

    // Validate amount
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount)) {
      setError('Bitte geben Sie einen gültigen Betrag ein')
      return
    }

    const validation = validatePaymentAmount(parsedAmount, outstanding)
    if (!validation.valid) {
      setError(validation.error ?? 'Ungültiger Betrag')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          amount: parsedAmount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: notes.trim() || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Zahlung konnte nicht erstellt werden')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <h2
          id="payment-modal-title"
          className="text-xl font-bold text-gray-900 dark:text-gray-100"
        >
          Als bezahlt markieren
        </h2>

        {/* Invoice summary */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Rechnungsnr.</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {invoice.invoice_number}
            </span>
          </div>
          {invoice.partner && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Partner</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {invoice.partner.company_name}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Rechnungsdatum</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatSwissDate(invoice.invoice_date)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">Gesamtbetrag</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatCHF(invoice.total_amount)}
            </span>
          </div>
          {(invoice.amount_paid ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Bereits bezahlt</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCHF(invoice.amount_paid)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Offener Betrag</span>
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {formatCHF(outstanding)}
            </span>
          </div>
        </div>

        {/* Payment form */}
        <div className="mt-4 space-y-4">
          {/* Amount */}
          <div>
            <label
              htmlFor="payment-amount"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Zahlungsbetrag (CHF)
            </label>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={outstanding}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Payment date */}
          <div>
            <label
              htmlFor="payment-date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Zahlungsdatum
            </label>
            <input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={loading}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Payment method */}
          <div>
            <label
              htmlFor="payment-method"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Zahlungsart
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={loading}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="payment-notes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Notizen (optional)
            </label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. Referenznummer, Bemerkungen..."
              rows={2}
              disabled={loading}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            size="lg"
            fullWidth
            onClick={onClose}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            loading={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            Zahlung erfassen
          </Button>
        </div>
      </div>
    </div>
  )
}
