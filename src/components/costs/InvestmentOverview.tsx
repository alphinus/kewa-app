'use client'

/**
 * InvestmentOverview Component
 *
 * Grid of UnitInvestmentCards showing all units with cost data.
 * Includes summary row, building filter, and sort options.
 *
 * Phase 10-06: Unit Investment View and Rent Entry
 * Requirement: RENT-03 - Investment-Übersicht pro Unit
 */

import { useState, useMemo, useCallback } from 'react'
import { UnitInvestmentCard } from './UnitInvestmentCard'
import { formatCHF } from '@/lib/costs/payment-helpers'
import type { UnitCosts } from '@/types/database'

type SortOption = 'name' | 'investment' | 'payback'

interface UnitCostWithBuilding extends UnitCosts {
  building_id?: string
  building_name?: string
}

interface Building {
  id: string
  name: string
}

interface InvestmentOverviewProps {
  /** Units with cost data */
  units: UnitCostWithBuilding[]
  /** Available buildings for filter */
  buildings: Building[]
  /** Whether user can edit rent amounts */
  canEditRent?: boolean
  /** Initial building filter */
  initialBuildingId?: string
}

/**
 * Format years with German label
 */
function formatYears(years: number | null): string {
  if (years === null) return '-'
  if (years < 1) return `${Math.round(years * 12)} Mt.`
  return `${years.toFixed(1)} J.`
}

/**
 * InvestmentOverview - Grid of unit investment cards
 *
 * Shows all units with investment data in a responsive grid.
 * Includes summary stats, building filter, and sort options.
 */
export function InvestmentOverview({
  units: initialUnits,
  buildings,
  canEditRent = false,
  initialBuildingId
}: InvestmentOverviewProps) {
  const [units, setUnits] = useState(initialUnits)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    initialBuildingId ?? ''
  )
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [sortAsc, setSortAsc] = useState(true)

  /**
   * Handle rent update from child card
   */
  const handleRentUpdate = useCallback((unitId: string, newRent: number | null) => {
    setUnits(prev => prev.map(u => {
      if (u.unit_id !== unitId) return u

      // Recalculate years_to_recover
      const annualRent = newRent ? newRent * 12 : null
      const yearsToRecover = annualRent && annualRent > 0 && u.total_investment > 0
        ? u.total_investment / annualRent
        : null

      return {
        ...u,
        rent_amount: newRent,
        years_to_recover: yearsToRecover
      }
    }))
  }, [])

  /**
   * Filter and sort units
   */
  const displayedUnits = useMemo(() => {
    let filtered = units

    // Filter by building
    if (selectedBuildingId) {
      filtered = filtered.filter(u => u.building_id === selectedBuildingId)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.unit_name.localeCompare(b.unit_name, 'de')
          break
        case 'investment':
          comparison = (a.total_investment ?? 0) - (b.total_investment ?? 0)
          break
        case 'payback':
          // Null values go last
          const paybackA = a.years_to_recover ?? Number.MAX_VALUE
          const paybackB = b.years_to_recover ?? Number.MAX_VALUE
          comparison = paybackA - paybackB
          break
      }

      return sortAsc ? comparison : -comparison
    })

    return sorted
  }, [units, selectedBuildingId, sortBy, sortAsc])

  /**
   * Calculate summary statistics
   */
  const summary = useMemo(() => {
    const unitsWithRent = displayedUnits.filter(u => u.rent_amount && u.rent_amount > 0)
    const totalInvestment = displayedUnits.reduce((sum, u) => sum + (u.total_investment ?? 0), 0)
    const paybackYears = displayedUnits
      .filter(u => u.years_to_recover !== null)
      .map(u => u.years_to_recover as number)
    const avgPayback = paybackYears.length > 0
      ? paybackYears.reduce((sum, y) => sum + y, 0) / paybackYears.length
      : null

    return {
      totalUnits: displayedUnits.length,
      unitsWithRent: unitsWithRent.length,
      totalInvestment,
      avgPayback
    }
  }, [displayedUnits])

  /**
   * Handle sort change
   */
  const handleSortChange = (newSort: SortOption) => {
    if (sortBy === newSort) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(newSort)
      setSortAsc(newSort === 'name') // Default: asc for name, desc for numbers
    }
  }

  // Empty state
  if (units.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 className="mt-3 text-lg font-medium text-gray-900 dark:text-gray-100">
          Keine Einheiten gefunden
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Es wurden keine Einheiten mit Kostendaten gefunden.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Einheiten</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {summary.totalUnits}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {summary.unitsWithRent} mit Miete
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Investment</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCHF(summary.totalInvestment)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 md:col-span-2">
          <div className="text-sm text-gray-500 dark:text-gray-400">Durchschn. Amortisation</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {summary.avgPayback !== null
              ? `${summary.avgPayback.toFixed(1)} Jahre`
              : 'Nicht berechenbar'}
          </div>
          {summary.avgPayback === null && (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Mietzinse erfassen für Berechnung
            </div>
          )}
        </div>
      </div>

      {/* Filters and sort */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Building filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="building-filter"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Gebäude:
          </label>
          <select
            id="building-filter"
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Alle Gebäude</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Sortieren:</span>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => handleSortChange('name')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                sortBy === 'name'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Name {sortBy === 'name' && (sortAsc ? '\u2191' : '\u2193')}
            </button>
            <button
              onClick={() => handleSortChange('investment')}
              className={`px-3 py-1.5 text-sm font-medium border-x border-gray-300 dark:border-gray-600 transition-colors ${
                sortBy === 'investment'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Investment {sortBy === 'investment' && (sortAsc ? '\u2191' : '\u2193')}
            </button>
            <button
              onClick={() => handleSortChange('payback')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                sortBy === 'payback'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Amortisation {sortBy === 'payback' && (sortAsc ? '\u2191' : '\u2193')}
            </button>
          </div>
        </div>
      </div>

      {/* Empty filter state */}
      {displayedUnits.length === 0 && (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            Keine Einheiten in diesem Gebäude gefunden.
          </p>
          <button
            onClick={() => setSelectedBuildingId('')}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Units grid */}
      {displayedUnits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedUnits.map((unit) => (
            <UnitInvestmentCard
              key={unit.unit_id}
              unit={unit}
              canEditRent={canEditRent}
              showDetailLink={true}
              onRentUpdate={handleRentUpdate}
              variant="compact"
            />
          ))}
        </div>
      )}
    </div>
  )
}
