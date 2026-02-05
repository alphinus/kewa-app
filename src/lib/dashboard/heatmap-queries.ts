/**
 * Heatmap Query Module
 *
 * Fetch unit data with room conditions for building heatmap display.
 * Uses single query with embedded rooms and computes aggregates in TypeScript.
 *
 * Phase 12-02: Property Dashboard & Heatmap
 * Phase 32-02: PERF-04 N+1 elimination - refactored to single query
 * Requirements: DASH-02, DASH-03 (building heatmap, unit conditions)
 */

import { getCachedUnitsWithRooms } from '@/lib/supabase/cached-queries'
import type { RoomCondition } from '@/types'

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

/**
 * Compute condition aggregates from rooms array
 *
 * Replaces database view query - compute in TypeScript to eliminate N+1
 */
function computeConditionSummary(rooms: Array<{ condition: RoomCondition }>) {
  const total = rooms.length
  const newRooms = rooms.filter(r => r.condition === 'new').length
  const partialRooms = rooms.filter(r => r.condition === 'partial').length
  const oldRooms = rooms.filter(r => r.condition === 'old').length

  // Renovation percentage = (new + partial) / total * 100
  const renovationPercentage = total > 0
    ? Math.round(((newRooms + partialRooms) / total) * 100)
    : 0

  // Overall condition: worst condition present
  let overallCondition: RoomCondition | null = null
  if (oldRooms > 0) overallCondition = 'old'
  else if (partialRooms > 0) overallCondition = 'partial'
  else if (newRooms > 0) overallCondition = 'new'

  return {
    total_rooms: total,
    new_rooms: newRooms,
    partial_rooms: partialRooms,
    old_rooms: oldRooms,
    renovation_percentage: renovationPercentage,
    overall_condition: overallCondition
  }
}

/**
 * Fetch heatmap data for all units in a building
 *
 * Single query with embedded rooms relation - no N+1.
 * Condition aggregates computed in TypeScript.
 *
 * @param buildingId - Building to fetch units for
 * @returns Array of units with condition data
 */
export async function fetchHeatmapData(
  buildingId: string
): Promise<HeatmapUnit[]> {
  // Single cached query with embedded rooms - eliminates N+1
  const units = await getCachedUnitsWithRooms(buildingId)

  // Filter to apartments only and compute condition aggregates
  return units
    .filter(unit => unit.unit_type === 'apartment')
    .map(unit => {
      const rooms = unit.rooms ?? []
      const summary = computeConditionSummary(rooms)

      return {
        id: unit.id,
        name: unit.name,
        floor: unit.floor,
        position: unit.position,
        unit_type: unit.unit_type,
        tenant_name: unit.tenant_name,
        total_rooms: summary.total_rooms,
        new_rooms: summary.new_rooms,
        partial_rooms: summary.partial_rooms,
        old_rooms: summary.old_rooms,
        renovation_percentage: summary.renovation_percentage,
        overall_condition: summary.overall_condition,
        rooms
      }
    })
}
