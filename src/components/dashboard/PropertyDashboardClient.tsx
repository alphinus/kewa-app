/**
 * PropertyDashboardClient Component
 *
 * Client component wrapper for side panel state management.
 * Handles unit click events and manages UnitDetailPanel visibility.
 *
 * Phase 12-04: Drilldown Navigation & Side Panel
 * Requirements: DASH-04, DASH-06 (side panel, unit details)
 */

'use client'

import { useState, useCallback } from 'react'
import { UnitDetailPanel } from './UnitDetailPanel'
import type { HeatmapUnit } from '@/lib/dashboard/heatmap-queries'

interface PropertyDashboardClientProps {
  units: HeatmapUnit[]
  children: React.ReactNode
}

export function PropertyDashboardClient({
  units,
  children
}: PropertyDashboardClientProps) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  const selectedUnit = selectedUnitId
    ? units.find(u => u.id === selectedUnitId) || null
    : null

  const handleUnitClick = useCallback((unitId: string) => {
    setSelectedUnitId(unitId)
  }, [])

  return (
    <>
      <div
        onClick={(e) => {
          // Handle click events from child components
          const target = e.target as HTMLElement
          const unitCard = target.closest('[data-unit-id]')
          if (unitCard) {
            const unitId = unitCard.getAttribute('data-unit-id')
            if (unitId) handleUnitClick(unitId)
          }
        }}
      >
        {children}
      </div>

      <UnitDetailPanel
        unit={selectedUnit}
        onClose={() => setSelectedUnitId(null)}
      />
    </>
  )
}
