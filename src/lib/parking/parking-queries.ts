/**
 * Parking spot query functions
 * Server-side operations for fetching and updating parking data
 */

import { createPublicClient } from '@/lib/supabase/with-org'
import type { ParkingSpot } from '@/types/database'
import type { ParkingStatus } from '@/types'

/**
 * Fetch all parking spots for a building, ordered by parking number
 */
export async function fetchParkingSpots(buildingId: string): Promise<ParkingSpot[]> {
  const supabase = await createPublicClient()

  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('building_id', buildingId)
    .eq('unit_type', 'parking_spot')
    .order('parking_number', { ascending: true })

  if (error) {
    console.error('Error fetching parking spots:', error)
    return []
  }

  return data as ParkingSpot[]
}

/**
 * Update parking spot status and optionally assign a tenant
 */
export async function updateParkingStatus(
  spotId: string,
  status: ParkingStatus,
  tenantName?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createPublicClient()

  const { error } = await supabase
    .from('units')
    .update({
      parking_status: status,
      tenant_name: status === 'free' ? null : tenantName ?? null
    })
    .eq('id', spotId)
    .eq('unit_type', 'parking_spot')

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get parking statistics for a building
 */
export async function getParkingStats(buildingId: string): Promise<{
  total: number
  occupied: number
  free: number
  maintenance: number
}> {
  const spots = await fetchParkingSpots(buildingId)

  return {
    total: spots.length,
    occupied: spots.filter(s => s.parking_status === 'occupied').length,
    free: spots.filter(s => s.parking_status === 'free').length,
    maintenance: spots.filter(s => s.parking_status === 'maintenance').length
  }
}

/**
 * Fetch a single parking spot by ID
 */
export async function fetchParkingSpot(spotId: string): Promise<ParkingSpot | null> {
  const supabase = await createPublicClient()

  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('id', spotId)
    .eq('unit_type', 'parking_spot')
    .single()

  if (error) {
    console.error('Error fetching parking spot:', error)
    return null
  }

  return data as ParkingSpot
}
