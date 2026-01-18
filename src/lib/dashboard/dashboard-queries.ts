/**
 * Dashboard Query Module
 *
 * Server-side queries for dashboard data aggregation.
 * Used by PropertyDashboard component.
 *
 * Phase 12-02: Property Dashboard & Heatmap
 * Requirements: DASH-01 (property dashboard)
 */

import { createClient } from '@/lib/supabase/server'

export interface DashboardSummary {
  totalUnits: number
  totalRooms: number
  renovatedRooms: number
  averageRenovationPercent: number
  unitsWithProjects: number
  activeProjects: number
}

/**
 * Fetch dashboard summary statistics for a building
 *
 * @param buildingId - Building to aggregate stats for
 * @returns Dashboard summary with unit, room, and project counts
 */
export async function fetchDashboardSummary(
  buildingId: string
): Promise<DashboardSummary> {
  const supabase = await createClient()

  // Get unit condition summaries from the view
  const { data: summaries } = await supabase
    .from('unit_condition_summary')
    .select('*')
    .eq('building_id', buildingId)

  // Get active projects count for units in this building
  const unitIds = (summaries || []).map(s => s.unit_id)

  let activeProjects = 0
  if (unitIds.length > 0) {
    const { count } = await supabase
      .from('renovation_projects')
      .select('id', { count: 'exact', head: true })
      .in('unit_id', unitIds)
      .in('status', ['planned', 'active', 'blocked'])

    activeProjects = count || 0
  }

  const units = summaries || []
  const totalRooms = units.reduce((sum, u) => sum + (u.total_rooms || 0), 0)
  const renovatedRooms = units.reduce((sum, u) => sum + (u.new_rooms || 0), 0)
  const avgPercent = units.length > 0
    ? units.reduce((sum, u) => sum + (u.renovation_percentage || 0), 0) / units.length
    : 0

  return {
    totalUnits: units.length,
    totalRooms,
    renovatedRooms,
    averageRenovationPercent: Math.round(avgPercent),
    unitsWithProjects: units.filter(u => (u.new_rooms || 0) > 0 || (u.partial_rooms || 0) > 0).length,
    activeProjects
  }
}
