'use client'

/**
 * RentEditModal Component
 *
 * Modal for editing the monthly rent amount of a unit.
 * Shows current value pre-filled, validates positive number.
 *
 * Phase 10-06: Unit Investment View and Rent Entry
 * Requirement: RENT-01 - Mietzins pro Unit speicherbar
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { formatCHF } from '@/lib/costs/payment-helpers'

interface RentEditModalProps {
  /** Unit ID to update */
  unitId: string
  /** Unit name for display */
  unitName: string
  /** Current rent amount (null if not set) */
  currentRent: number | null
  /** Callback when modal is closed */
  onClose: () => void
  /** Callback when rent is successfully updated */
  onSuccess: (newRent: number | null) => void
}

/**
 * RentEditModal - Edit unit monthly rent
 *
 * Shows input for monthly rent in CHF with current value pre-filled.
 * Validates that rent is positive number or can be cleared.
 * Refreshes parent data after successful save.
 */
export function RentEditModal({
  unitId,
  unitName,
  currentRent,
  onClose,
  onSuccess
}: RentEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rentAmount, setRentAmount] = useState(
    currentRent !== null ? currentRent.toString() : ''
  )

  const modalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount, handle escape key
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Parse and validate rent amount
    let parsedRent: number | null = null

    if (rentAmount.trim() !== '') {
      parsedRent = parseFloat(rentAmount)

      if (isNaN(parsedRent)) {
        setError('Bitte geben Sie eine gueltige Zahl ein')
        return
      }

      if (parsedRent < 0) {
        setError('Mietzins kann nicht negativ sein')
        return
      }
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/units/${unitId}/rent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rent_amount: parsedRent
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Mietzins konnte nicht gespeichert werden')
      }

      onSuccess(parsedRent)
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

  // Calculate annual rent for preview
  const previewRent = rentAmount.trim() !== '' ? parseFloat(rentAmount) : null
  const annualRent = previewRent && !isNaN(previewRent) && previewRent > 0
    ? previewRent * 12
    : null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rent-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 shadow-xl"
      >
        {/* Header */}
        <h2
          id="rent-modal-title"
          className="text-xl font-bold text-gray-900 dark:text-gray-100"
        >
          Mietzins bearbeiten
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {unitName}
        </p>

        {/* Current value info */}
        {currentRent !== null && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Aktueller Mietzins
            </div>
            <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {formatCHF(currentRent)} / Monat
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Rent amount input */}
          <div>
            <label
              htmlFor="rent-amount"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Monatlicher Mietzins (CHF)
            </label>
            <input
              ref={inputRef}
              id="rent-amount"
              type="number"
              step="0.01"
              min="0"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              placeholder="z.B. 1850.00"
              disabled={loading}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leer lassen um Mietzins zu entfernen
            </p>
          </div>

          {/* Annual rent preview */}
          {annualRent !== null && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="text-sm text-blue-700 dark:text-blue-400">
                Jaehrliche Mieteinnahmen
              </div>
              <div className="text-lg font-semibold text-blue-900 dark:text-blue-200">
                {formatCHF(annualRent)}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              onClick={onClose}
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              Speichern
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
