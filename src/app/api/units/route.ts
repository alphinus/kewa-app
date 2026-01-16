import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UnitWithStats, UnitsResponse, ErrorResponse } from '@/types/database'
import type { Role } from '@/types'

/**
 * GET /api/units
 *
 * Returns all units with task statistics (open and total task counts).
 * For Imeri role: filters out units where tenant_visible_to_imeri=false
 *
 * Sorted by floor (descending, nulls last) then name
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<UnitsResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Query units with task counts via a manual aggregation
    // First, get all units
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')
      .order('floor', { ascending: false, nullsFirst: false })
      .order('name', { ascending: true })

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
      return NextResponse.json(
        { error: 'Failed to fetch units' },
        { status: 500 }
      )
    }

    // For Imeri, filter out units where tenant is not visible
    let filteredUnits = units || []
    if (userRole === 'imeri') {
      filteredUnits = filteredUnits.filter(unit => unit.tenant_visible_to_imeri)
    }

    // Get task counts per unit via projects
    // We need: projects -> tasks aggregation per unit
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        unit_id,
        visible_to_imeri,
        tasks (
          id,
          status
        )
      `)

    if (projectsError) {
      console.error('Error fetching projects with tasks:', projectsError)
      return NextResponse.json(
        { error: 'Failed to fetch task statistics' },
        { status: 500 }
      )
    }

    // Build task counts per unit
    const taskCountsByUnit: Record<string, { open: number; total: number }> = {}

    for (const project of projects || []) {
      // For Imeri, skip projects that are not visible
      if (userRole === 'imeri' && !project.visible_to_imeri) {
        continue
      }

      const unitId = project.unit_id
      if (!taskCountsByUnit[unitId]) {
        taskCountsByUnit[unitId] = { open: 0, total: 0 }
      }

      const tasks = project.tasks || []
      for (const task of tasks as Array<{ id: string; status: string }>) {
        taskCountsByUnit[unitId].total++
        if (task.status === 'open') {
          taskCountsByUnit[unitId].open++
        }
      }
    }

    // Map units to UnitWithStats
    const unitsWithStats: UnitWithStats[] = filteredUnits.map(unit => ({
      ...unit,
      open_tasks_count: taskCountsByUnit[unit.id]?.open || 0,
      total_tasks_count: taskCountsByUnit[unit.id]?.total || 0,
    }))

    return NextResponse.json({ units: unitsWithStats })
  } catch (error) {
    console.error('Unexpected error in GET /api/units:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
