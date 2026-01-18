/**
 * Occupancy Query Module
 *
 * Server-side queries for occupancy calculations and metrics.
 * Aggregates unit and parking occupancy data.
 *
 * Phase 12-03: Occupancy Dashboard
 * Requirements: OCCU-01, OCCU-02, OCCU-03, OCCU-04, PARK-05
 */

import { createClient } from '@/lib/supabase/server'

export interface OccupancyMetrics {
  totalUnits: number
  occupiedUnits: number
  unitOccupancyPercent: number

  totalParking: number
  occupiedParking: number
  parkingOccupancyPercent: number

  combinedOccupancyPercent: number
}

/**
 * Fetch occupancy metrics for a building
 *
 * @param buildingId - Building to calculate occupancy for
 * @returns Occupancy metrics with unit, parking, and combined percentages
 */
export async function fetchOccupancyMetrics(
  buildingId: string
): Promise<OccupancyMetrics> {
  const supabase = await createClient()

  // Fetch all units for this building
  const { data: units } = await supabase
    .from('units')
    .select('id, unit_type, tenant_name, parking_status')
    .eq('building_id', buildingId)

  // Separate apartments and parking spots
  const apartments = (units || []).filter(u => u.unit_type === 'apartment')
  const parking = (units || []).filter(u => u.unit_type === 'parking_spot')

  // Calculate unit occupancy (vacant = tenant_name IS NULL)
  const occupiedUnits = apartments.filter(u => u.tenant_name).length
  const totalUnits = apartments.length

  // Calculate parking occupancy
  const occupiedParking = parking.filter(u => u.parking_status === 'occupied').length
  const totalParking = parking.length

  // Calculate percentages
  const unitOccupancyPercent = totalUnits > 0
    ? Math.round((occupiedUnits / totalUnits) * 100)
    : 0

  const parkingOccupancyPercent = totalParking > 0
    ? Math.round((occupiedParking / totalParking) * 100)
    : 0

  // Combined occupancy: weighted average of all slots
  const totalSlots = totalUnits + totalParking
  const occupiedSlots = occupiedUnits + occupiedParking
  const combinedOccupancyPercent = totalSlots > 0
    ? Math.round((occupiedSlots / totalSlots) * 100)
    : 0

  return {
    totalUnits,
    occupiedUnits,
    unitOccupancyPercent,
    totalParking,
    occupiedParking,
    parkingOccupancyPercent,
    combinedOccupancyPercent
  }
}

/**
 * Fetch occupancy trend history for a building
 *
 * For MVP: Returns mock trend data for sparkline visualization.
 * Future: Query from occupancy_history table with monthly snapshots.
 *
 * @param buildingId - Building to fetch history for
 * @param months - Number of months of history (default: 6)
 * @returns Array of occupancy percentages (most recent last)
 */
export async function fetchOccupancyHistory(
  buildingId: string,
  months: number = 6
): Promise<number[]> {
  // For MVP: return mock trend data
  // This provides a visual placeholder until historical tracking is implemented.
  // Future implementation would query from occupancy_history table with monthly snapshots.
  //
  // Pattern for future:
  // const { data } = await supabase
  //   .from('occupancy_history')
  //   .select('month, combined_percent')
  //   .eq('building_id', buildingId)
  //   .order('month', { ascending: true })
  //   .limit(months)
  //
  // return data.map(d => d.combined_percent)

  // Mock data showing a realistic upward trend
  return [85, 88, 87, 91, 90, 92]
}
