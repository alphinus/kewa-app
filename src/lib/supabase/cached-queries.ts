/**
 * Cached Query Module
 *
 * React cache() wrappers for Supabase queries to prevent N+1 in Server Components.
 * Request-level deduplication - same query called multiple times in one request returns cached result.
 *
 * Phase 32-02: PERF-04 N+1 elimination
 */

import { cache } from 'react'
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { RoomCondition } from '@/types'

export interface UnitWithRooms {
  id: string
  name: string
  floor: number | null
  position: string | null
  unit_type: string
  tenant_name: string | null
  parking_status: string | null
  rooms: Array<{
    id: string
    name: string
    room_type: string
    condition: RoomCondition
  }>
}

export interface UnitConditionSummary {
  unit_id: string
  building_id: string
  total_rooms: number
  new_rooms: number
  partial_rooms: number
  old_rooms: number
  renovation_percentage: number
  overall_condition: RoomCondition | null
}

/**
 * Get units with embedded rooms for a building (single query, no N+1)
 *
 * Replaces pattern: query units, then query rooms separately
 * Now: single query with embedded relation
 */
export const getCachedUnitsWithRooms = cache(async (buildingId: string): Promise<UnitWithRooms[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('units')
    .select(`
      id, name, floor, position, unit_type, tenant_name, parking_status,
      rooms (id, name, room_type, condition)
    `)
    .eq('building_id', buildingId)
    .order('floor', { ascending: false })

  if (error) throw error

  return (data ?? []) as UnitWithRooms[]
})

/**
 * Get unit condition summaries for a building (single query)
 *
 * Uses the unit_condition_summary view which aggregates room conditions.
 */
export const getCachedUnitConditionSummary = cache(async (buildingId: string): Promise<UnitConditionSummary[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('unit_condition_summary')
    .select('*')
    .eq('building_id', buildingId)

  if (error) throw error

  return (data ?? []) as UnitConditionSummary[]
})

/**
 * Get active project count for units (single query with IN clause)
 */
export const getCachedActiveProjectCount = cache(async (unitIds: string[]): Promise<number> => {
  if (unitIds.length === 0) return 0

  const supabase = await createClient()

  const { count, error } = await supabase
    .from('renovation_projects')
    .select('id', { count: 'exact', head: true })
    .in('unit_id', unitIds)
    .in('status', ['planned', 'active', 'blocked'])

  if (error) throw error

  return count ?? 0
})
