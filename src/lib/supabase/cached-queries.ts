/**
 * Cached Query Module
 *
 * React cache() wrappers for Supabase queries to prevent N+1 in Server Components.
 * Request-level deduplication - same query called multiple times in one request returns cached result.
 * Cache keys include orgId to prevent cross-tenant cache hits.
 *
 * Phase 32-02: PERF-04 N+1 elimination
 */

import { cache } from 'react'
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
 * Create an org-scoped Supabase client for server component use.
 *
 * Calls set_org_context RPC to enable RLS row filtering by organization.
 * orgId MUST be passed as a parameter (not read from cookies here) because
 * cache() keys on arguments — reading from cookies inside would break cache
 * isolation between orgs.
 */
async function createOrgScopedClient(orgId: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch { /* server component — cookie writes are no-ops */ }
        },
      },
    }
  )
  await supabase.rpc('set_org_context', { org_id: orgId })
  return supabase
}

/**
 * Get units with embedded rooms for a building (single query, no N+1)
 *
 * Replaces pattern: query units, then query rooms separately
 * Now: single query with embedded relation
 *
 * @param buildingId - Building to fetch units for
 * @param orgId - Organization UUID (sets RLS context; also used as cache key)
 */
export const getCachedUnitsWithRooms = cache(async (buildingId: string, orgId: string): Promise<UnitWithRooms[]> => {
  const supabase = await createOrgScopedClient(orgId)

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
 *
 * @param buildingId - Building to fetch summaries for
 * @param orgId - Organization UUID (sets RLS context; also used as cache key)
 */
export const getCachedUnitConditionSummary = cache(async (buildingId: string, orgId: string): Promise<UnitConditionSummary[]> => {
  const supabase = await createOrgScopedClient(orgId)

  const { data, error } = await supabase
    .from('unit_condition_summary')
    .select('*')
    .eq('building_id', buildingId)

  if (error) throw error

  return (data ?? []) as UnitConditionSummary[]
})

/**
 * Get active project count for units (single query with IN clause)
 *
 * @param unitIds - Unit IDs to count projects for
 * @param orgId - Organization UUID (sets RLS context; also used as cache key)
 */
export const getCachedActiveProjectCount = cache(async (unitIds: string[], orgId: string): Promise<number> => {
  if (unitIds.length === 0) return 0

  const supabase = await createOrgScopedClient(orgId)

  const { count, error } = await supabase
    .from('renovation_projects')
    .select('id', { count: 'exact', head: true })
    .in('unit_id', unitIds)
    .in('status', ['planned', 'active', 'blocked'])

  if (error) throw error

  return count ?? 0
})
