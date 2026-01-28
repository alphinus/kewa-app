/**
 * Analytics Queries for Supplier Management
 *
 * Functions for price history, seasonal consumption, and purchase order allocations.
 * Phase 20-03: Price Analytics and Multi-Property Allocations
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PriceHistoryPoint,
  SeasonalConsumption,
  PurchaseOrderAllocation,
  CreateAllocationInput,
} from '@/types/suppliers'

// =============================================
// MONTH UTILITIES
// =============================================

const MONTH_NAMES: Record<number, string> = {
  1: 'Januar',
  2: 'Februar',
  3: 'März',
  4: 'April',
  5: 'Mai',
  6: 'Juni',
  7: 'Juli',
  8: 'August',
  9: 'September',
  10: 'Oktober',
  11: 'November',
  12: 'Dezember',
}

/**
 * Get German month name for month number (1-12)
 */
export function getMonthName(month: number): string {
  return MONTH_NAMES[month] ?? 'Unbekannt'
}

// =============================================
// PRICE HISTORY
// =============================================

export interface PriceHistoryFilters {
  supplier_id?: string
  property_id?: string
  date_from?: string
  date_to?: string
}

/**
 * Get price history from delivery_price_history view
 * Joins supplier and property names
 */
export async function getPriceHistory(
  supabase: SupabaseClient,
  filters: PriceHistoryFilters = {}
): Promise<PriceHistoryPoint[]> {
  let query = supabase
    .from('delivery_price_history')
    .select('*')
    .order('delivery_date', { ascending: true })

  // Apply filters
  if (filters.supplier_id) {
    query = query.eq('supplier_id', filters.supplier_id)
  }
  if (filters.property_id) {
    query = query.eq('property_id', filters.property_id)
  }
  if (filters.date_from) {
    query = query.gte('delivery_date', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('delivery_date', filters.date_to)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch price history: ${error.message}`)
  }

  return (data ?? []) as PriceHistoryPoint[]
}

// =============================================
// SEASONAL CONSUMPTION
// =============================================

/**
 * Get seasonal consumption from seasonal_consumption view
 * Optionally filter by property
 */
export async function getSeasonalConsumption(
  supabase: SupabaseClient,
  propertyId?: string
): Promise<SeasonalConsumption[]> {
  let query = supabase
    .from('seasonal_consumption')
    .select('*')
    .order('year', { ascending: true })
    .order('month', { ascending: true })

  if (propertyId) {
    query = query.eq('property_id', propertyId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch seasonal consumption: ${error.message}`)
  }

  return (data ?? []) as SeasonalConsumption[]
}

// =============================================
// PURCHASE ORDER ALLOCATIONS
// =============================================

/**
 * Get allocations for a purchase order
 * Joins property names
 */
export async function getAllocations(
  supabase: SupabaseClient,
  purchaseOrderId: string
): Promise<PurchaseOrderAllocation[]> {
  const { data, error } = await supabase
    .from('purchase_order_allocations')
    .select(`
      *,
      property:properties!property_id (
        id,
        name
      ),
      delivery:deliveries (
        id,
        delivery_date
      )
    `)
    .eq('purchase_order_id', purchaseOrderId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch allocations: ${error.message}`)
  }

  return (data ?? []) as PurchaseOrderAllocation[]
}

/**
 * Create a purchase order allocation
 * Database trigger validates total does not exceed PO amount
 */
export async function createAllocation(
  supabase: SupabaseClient,
  input: CreateAllocationInput
): Promise<PurchaseOrderAllocation> {
  const { data, error } = await supabase
    .from('purchase_order_allocations')
    .insert({
      purchase_order_id: input.purchase_order_id,
      property_id: input.property_id,
      building_id: input.building_id ?? null,
      allocated_quantity: input.allocated_quantity,
      allocated_amount: input.allocated_amount,
      notes: input.notes?.trim() || null,
    })
    .select(`
      *,
      property:properties!property_id (
        id,
        name
      )
    `)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as PurchaseOrderAllocation
}
