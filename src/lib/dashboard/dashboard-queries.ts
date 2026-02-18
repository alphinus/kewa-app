/**
 * Dashboard Query Module
 *
 * Server-side queries for dashboard data aggregation.
 * Used by PropertyDashboard component.
 *
 * Phase 12-02: Property Dashboard & Heatmap
 * Phase 32-02: PERF-04 N+1 elimination - use cached queries
 * Requirements: DASH-01 (property dashboard)
 */

import {
  getCachedUnitConditionSummary,
  getCachedActiveProjectCount
} from '@/lib/supabase/cached-queries'

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
 * Uses cached queries for request-level deduplication.
 * If both dashboard and heatmap load on same page, queries execute once.
 *
 * @param buildingId - Building to aggregate stats for
 * @param orgId - Organization UUID (passed to cached queries for RLS context and cache isolation)
 * @returns Dashboard summary with unit, room, and project counts
 */
export async function fetchDashboardSummary(
  buildingId: string,
  orgId: string
): Promise<DashboardSummary> {
  // Get unit condition summaries (cached)
  const summaries = await getCachedUnitConditionSummary(buildingId, orgId)

  // Get active projects count (cached)
  const unitIds = summaries.map(s => s.unit_id)
  const activeProjects = await getCachedActiveProjectCount(unitIds, orgId)

  const totalRooms = summaries.reduce((sum, u) => sum + (u.total_rooms || 0), 0)
  const renovatedRooms = summaries.reduce((sum, u) => sum + (u.new_rooms || 0), 0)
  const avgPercent = summaries.length > 0
    ? summaries.reduce((sum, u) => sum + (u.renovation_percentage || 0), 0) / summaries.length
    : 0

  return {
    totalUnits: summaries.length,
    totalRooms,
    renovatedRooms,
    averageRenovationPercent: Math.round(avgPercent),
    unitsWithProjects: summaries.filter(u => (u.new_rooms || 0) > 0 || (u.partial_rooms || 0) > 0).length,
    activeProjects
  }
}
