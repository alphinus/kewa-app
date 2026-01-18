/**
 * Heatmap Query Module
 *
 * Fetch unit data with room conditions for building heatmap display.
 * Uses unit_condition_summary view for aggregated condition data.
 *
 * Phase 12-02: Property Dashboard & Heatmap
 * Requirements: DASH-02, DASH-03 (building heatmap, unit conditions)
 */

import { createClient } from '@/lib/supabase/server'
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
 * Fetch heatmap data for all units in a building
 *
 * Combines unit basic info, condition summary, and room-level conditions
 * for heatmap visualization.
 *
 * @param buildingId - Building to fetch units for
 * @returns Array of units with condition data
 */
export async function fetchHeatmapData(
  buildingId: string
): Promise<HeatmapUnit[]> {
  const supabase = await createClient()

  // Fetch unit condition summaries
  const { data: summaries } = await supabase
    .from('unit_condition_summary')
    .select('*')
    .eq('building_id', buildingId)

  // Fetch units with room details
  const { data: units } = await supabase
    .from('units')
    .select(`
      id, name, floor, position, unit_type, tenant_name,
      rooms (id, name, room_type, condition)
    `)
    .eq('building_id', buildingId)
    .eq('unit_type', 'apartment')
    .order('floor', { ascending: false })

  // Merge unit data with condition summary
  return (units || []).map(unit => {
    const summary = (summaries || []).find(s => s.unit_id === unit.id)
    const rooms = (unit.rooms || []) as Array<{
      id: string
      name: string
      room_type: string
      condition: RoomCondition
    }>

    return {
      id: unit.id,
      name: unit.name,
      floor: unit.floor,
      position: unit.position,
      unit_type: unit.unit_type,
      tenant_name: unit.tenant_name,
      total_rooms: summary?.total_rooms || rooms.length,
      new_rooms: summary?.new_rooms || 0,
      partial_rooms: summary?.partial_rooms || 0,
      old_rooms: summary?.old_rooms || 0,
      renovation_percentage: summary?.renovation_percentage || 0,
      overall_condition: summary?.overall_condition || null,
      rooms
    }
  })
}
