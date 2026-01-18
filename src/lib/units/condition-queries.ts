/**
 * Condition Query Module
 *
 * Server-side queries for fetching room condition data.
 * Uses existing database views from migration 027_condition_tracking.sql.
 *
 * Phase 11-02: Room Condition Grid
 * Requirements: HIST-02, HIST-05
 */

import { createClient } from '@/lib/supabase/server'
import type { RoomCondition, RoomType } from '@/types'
import type { UnitConditionSummary } from '@/types/database'

/**
 * Room with condition information
 */
export interface RoomWithCondition {
  id: string
  name: string
  room_type: RoomType
  condition: RoomCondition
  condition_updated_at: string | null
  condition_source_project_id: string | null
  area_sqm: number | null
  notes: string | null
}

/**
 * Fetch unit condition summary from database view
 *
 * Uses the `unit_condition_summary` view which calculates:
 * - Total room count
 * - New/partial/old room counts
 * - Renovation percentage
 * - Overall condition
 *
 * @param unitId - The unit ID to fetch summary for
 * @returns UnitConditionSummary or null if not found
 */
export async function fetchUnitConditionSummary(
  unitId: string
): Promise<UnitConditionSummary | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('unit_condition_summary')
    .select('*')
    .eq('unit_id', unitId)
    .single()

  if (error) {
    // Not found is expected if unit has no rooms
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching unit condition summary:', error)
    return null
  }

  return data as UnitConditionSummary
}

/**
 * Fetch all rooms for a unit with their conditions
 *
 * Returns rooms ordered by room type, then name for consistent display.
 *
 * @param unitId - The unit ID to fetch rooms for
 * @returns Array of RoomWithCondition
 */
export async function fetchRoomsWithConditions(
  unitId: string
): Promise<RoomWithCondition[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      id,
      name,
      room_type,
      condition,
      condition_updated_at,
      condition_source_project_id,
      area_sqm,
      notes
    `)
    .eq('unit_id', unitId)
    .order('room_type')
    .order('name')

  if (error) {
    console.error('Error fetching rooms with conditions:', error)
    return []
  }

  return (data ?? []) as RoomWithCondition[]
}

/**
 * Fetch condition data for a unit (combined summary and rooms)
 *
 * Convenience function that fetches both summary and room details
 * in parallel for efficient data loading.
 *
 * @param unitId - The unit ID to fetch condition data for
 * @returns Object with summary and rooms
 */
export async function fetchUnitConditionData(unitId: string): Promise<{
  summary: UnitConditionSummary | null
  rooms: RoomWithCondition[]
}> {
  const [summary, rooms] = await Promise.all([
    fetchUnitConditionSummary(unitId),
    fetchRoomsWithConditions(unitId)
  ])

  return { summary, rooms }
}
