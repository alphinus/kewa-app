'use client'

/**
 * UnitInvestmentCard Component
 *
 * Card displaying unit investment summary with rent vs renovation cost comparison.
 * Shows: Mietzins (monatlich/jaehrlich), Renovationskosten, Amortisation.
 *
 * Phase 10-06: Unit Investment View and Rent Entry
 * Requirements: RENT-02, RENT-03
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { formatCHF } from '@/lib/costs/payment-helpers'
import { RentEditModal } from './RentEditModal'
import type { UnitCosts } from '@/types/database'

interface UnitInvestmentCardProps {
  /** Unit cost data from unit_costs view */
  unit: UnitCosts & {
    building_name?: string
  }
  /** Show edit rent button (requires permission) */
  canEditRent?: boolean
  /** Show link to detail view */
  showDetailLink?: boolean
  /** Callback when rent is updated */
  onRentUpdate?: (unitId: string, newRent: number | null) => void
  /** Variant: 'compact' for grid view, 'full' for detail page */
  variant?: 'compact' | 'full'
}

/**
 * Format years with German label
 */
function formatYears(years: number | null): string {
  if (years === null) return '-'
  if (years < 1) return `${Math.round(years * 12)} Monate`
  return `${years.toFixed(1)} Jahre`
}

/**
 * Get amortization color class based on years
 * < 10 years: green, 10-20 years: amber, > 20 years: red
 */
function getAmortizationColor(years: number | null): string {
  if (years === null) return 'text-gray-500 dark:text-gray-400'
  if (years < 10) return 'text-green-600 dark:text-green-400'
  if (years < 20) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * UnitInvestmentCard - Display unit investment summary
 *
 * Shows rent vs renovation costs with amortization calculation.
 * Includes edit rent button with modal integration.
 */
export function UnitInvestmentCard({
  unit,
  canEditRent = false,
  showDetailLink = true,
  onRentUpdate,
  variant = 'compact'
}: UnitInvestmentCardProps) {
  const [showRentModal, setShowRentModal] = useState(false)
  const [currentRent, setCurrentRent] = useState(unit.rent_amount)

  // Calculate derived values
  const annualRent = currentRent ? currentRent * 12 : null
  const yearsToRecover = annualRent && annualRent > 0 && unit.total_investment > 0
    ? unit.total_investment / annualRent
    : null

  /**
   * Handle successful rent update
   */
  const handleRentSuccess = useCallback((newRent: number | null) => {
    setCurrentRent(newRent)
    setShowRentModal(false)
    onRentUpdate?.(unit.unit_id, newRent)
  }, [unit.unit_id, onRentUpdate])

  // Empty state when no rent entered
  const hasRent = currentRent !== null && currentRent > 0
  const hasInvestment = unit.total_investment > 0

  if (variant === 'full') {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {unit.unit_name}
              </h3>
              {unit.building_name && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {unit.building_name}
                </p>
              )}
            </div>
            {canEditRent && (
              <button
                onClick={() => setShowRentModal(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Mietzins bearbeiten"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mietzins section */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Mietzins
            </h4>
            {hasRent ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Monatlich</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCHF(currentRent)}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Jaehrlich</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCHF(annualRent)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Kein Mietzins erfasst.
                  {canEditRent && (
                    <button
                      onClick={() => setShowRentModal(true)}
                      className="ml-1 underline hover:no-underline"
                    >
                      Jetzt erfassen
                    </button>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Renovationskosten section */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Renovationskosten
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Projekte</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCHF(unit.total_project_costs)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Direkte Ausgaben</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCHF(unit.direct_expenses)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="font-medium text-blue-700 dark:text-blue-300">Total Investment</span>
                <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCHF(unit.total_investment)}
                </span>
              </div>
            </div>
          </div>

          {/* Amortisation section */}
          {hasRent && hasInvestment && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Amortisation
              </h4>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Amortisation bei gleichbleibender Miete
                </div>
                <div className={`text-3xl font-bold ${getAmortizationColor(yearsToRecover)}`}>
                  {formatYears(yearsToRecover)}
                </div>
                <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  Berechnung: {formatCHF(unit.total_investment)} / {formatCHF(annualRent)} pro Jahr
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rent edit modal */}
        {showRentModal && (
          <RentEditModal
            unitId={unit.unit_id}
            unitName={unit.unit_name}
            currentRent={currentRent}
            onClose={() => setShowRentModal(false)}
            onSuccess={handleRentSuccess}
          />
        )}
      </div>
    )
  }

  // Compact variant for grid view
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {showDetailLink ? (
              <Link
                href={`/dashboard/kosten/wohnungen/${unit.unit_id}`}
                className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block"
              >
                {unit.unit_name}
              </Link>
            ) : (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {unit.unit_name}
              </h3>
            )}
            {unit.building_name && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {unit.building_name}
              </p>
            )}
          </div>
          {canEditRent && (
            <button
              onClick={() => setShowRentModal(true)}
              className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              aria-label="Mietzins bearbeiten"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Mietzins */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Mietzins/Mt.</span>
          <span className={`font-medium ${hasRent ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
            {hasRent ? formatCHF(currentRent) : 'Nicht erfasst'}
          </span>
        </div>

        {/* Investment */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Investment</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formatCHF(unit.total_investment)}
          </span>
        </div>

        {/* Amortisation */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">Amortisation</span>
          <span className={`font-semibold ${getAmortizationColor(yearsToRecover)}`}>
            {formatYears(yearsToRecover)}
          </span>
        </div>
      </div>

      {/* Detail link */}
      {showDetailLink && (
        <div className="px-4 pb-4">
          <Link
            href={`/dashboard/kosten/wohnungen/${unit.unit_id}`}
            className="block w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 py-2 px-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            Details anzeigen
          </Link>
        </div>
      )}

      {/* Rent edit modal */}
      {showRentModal && (
        <RentEditModal
          unitId={unit.unit_id}
          unitName={unit.unit_name}
          currentRent={currentRent}
          onClose={() => setShowRentModal(false)}
          onSuccess={handleRentSuccess}
        />
      )}
    </div>
  )
}
