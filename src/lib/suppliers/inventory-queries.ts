/**
 * Inventory Query Helpers
 *
 * Helper functions for querying inventory movements and current levels.
 * Phase: 20-02
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { InventoryMovement, CurrentInventoryLevel } from '@/types/suppliers'

/**
 * Get previous reading before a given date for a property
 */
export async function getPreviousReading(
  supabase: SupabaseClient,
  propertyId: string,
  beforeDate: string
): Promise<{ movement_date: string; tank_level: number } | null> {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('movement_date, tank_level')
    .eq('property_id', propertyId)
    .lt('movement_date', beforeDate)
    .order('movement_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching previous reading:', error)
    return null
  }

  return data
}

/**
 * Calculate consumption metrics between two readings
 */
export function calculateConsumption(
  previousReading: { movement_date: string; tank_level: number } | null,
  currentLevel: number,
  currentDate: string,
  movementType: 'delivery' | 'reading' | 'adjustment'
): {
  days_since_last: number | null
  consumption_amount: number | null
  daily_usage_rate: number | null
} {
  // Delivery adds to tank, doesn't represent consumption
  if (movementType === 'delivery') {
    return {
      days_since_last: null,
      consumption_amount: null,
      daily_usage_rate: null,
    }
  }

  if (!previousReading) {
    return {
      days_since_last: null,
      consumption_amount: null,
      daily_usage_rate: null,
    }
  }

  const currentDateObj = new Date(currentDate)
  const previousDateObj = new Date(previousReading.movement_date)
  const daysDiff = Math.floor(
    (currentDateObj.getTime() - previousDateObj.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysDiff <= 0) {
    return {
      days_since_last: null,
      consumption_amount: null,
      daily_usage_rate: null,
    }
  }

  const consumptionAmount = previousReading.tank_level - currentLevel
  const dailyUsageRate = consumptionAmount / daysDiff

  return {
    days_since_last: daysDiff,
    consumption_amount: consumptionAmount,
    daily_usage_rate: dailyUsageRate,
  }
}

/**
 * Get current inventory levels across all properties
 */
export async function getCurrentLevels(
  supabase: SupabaseClient
): Promise<CurrentInventoryLevel[]> {
  const { data, error } = await supabase
    .from('current_inventory_levels')
    .select('*')
    .order('property_id')

  if (error) {
    console.error('Error fetching current inventory levels:', error)
    return []
  }

  return data ?? []
}

/**
 * Get movement history for a property
 */
export async function getMovementHistory(
  supabase: SupabaseClient,
  propertyId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ movements: InventoryMovement[]; total: number }> {
  const { data, error, count } = await supabase
    .from('inventory_movements')
    .select(
      `
      *,
      property:properties!property_id (
        id,
        name
      ),
      delivery:deliveries!delivery_id (
        id,
        delivery_date
      )
    `,
      { count: 'exact' }
    )
    .eq('property_id', propertyId)
    .order('movement_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching movement history:', error)
    return { movements: [], total: 0 }
  }

  return {
    movements: data ?? [],
    total: count ?? 0,
  }
}
