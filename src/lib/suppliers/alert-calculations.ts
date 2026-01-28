/**
 * Alert Calculations and Utilities
 *
 * Functions for calculating reorder alerts and urgency classification.
 * Phase: 20-02
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReorderAlert } from '@/types/suppliers'

/**
 * Get reorder alerts from database function
 */
export async function getReorderAlerts(
  supabase: SupabaseClient,
  thresholdPercentage: number = 20
): Promise<ReorderAlert[]> {
  const { data, error } = await supabase.rpc('get_reorder_alerts', {
    threshold_pct: thresholdPercentage,
  })

  if (error) {
    console.error('Error fetching reorder alerts:', error)
    return []
  }

  if (!data) {
    return []
  }

  // Join with properties to get property name
  const propertyIds = data.map((alert: ReorderAlert) => alert.property_id)

  if (propertyIds.length === 0) {
    return []
  }

  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('id, name')
    .in('id', propertyIds)

  if (propError) {
    console.error('Error fetching property names:', propError)
    return data
  }

  const propertyMap = new Map(properties?.map(p => [p.id, p.name]) ?? [])

  return data.map((alert: ReorderAlert) => ({
    ...alert,
    property_name: propertyMap.get(alert.property_id),
  }))
}

/**
 * Get Tailwind color class for alert urgency
 */
export function getAlertUrgencyColor(
  urgency: 'critical' | 'warning' | 'normal'
): string {
  switch (urgency) {
    case 'critical':
      return 'text-red-600'
    case 'warning':
      return 'text-amber-600'
    case 'normal':
      return 'text-green-600'
    default:
      return 'text-gray-600'
  }
}

/**
 * Get German label for alert urgency
 */
export function getAlertUrgencyLabel(
  urgency: 'critical' | 'warning' | 'normal'
): string {
  switch (urgency) {
    case 'critical':
      return 'Kritisch'
    case 'warning':
      return 'Warnung'
    case 'normal':
      return 'Normal'
    default:
      return 'Unbekannt'
  }
}
