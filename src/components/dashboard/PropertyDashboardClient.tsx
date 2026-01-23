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
import type { RoomCondition } from '@/types'

// Local type definition to avoid server module import
export interface HeatmapUnit {
  id: string
  name: string
  floor: number | null
  position: string | null
  unit_type: string
  tenant_name: string | null
  total_rooms: number
  new_rooms: number
  partial_rooms: number
  old_rooms: number
  renovation_percentage: number | null
  overall_condition: RoomCondition | null
  rooms: Array<{
    id: string
    name: string
    room_type: string
    condition: RoomCondition
  }>
}

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
