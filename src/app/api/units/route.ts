/**
 * Units API - Collection Routes
 *
 * GET /api/units - List units (with building_id filter)
 * POST /api/units - Create a new unit
 *
 * Phase 15-01: Extended Unit API with building filter and creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UnitWithStats, UnitsResponse, ErrorResponse, CreateUnitInput } from '@/types/database'
import type { Role, UnitType } from '@/types'

// Valid unit types for validation
const VALID_UNIT_TYPES: UnitType[] = ['apartment', 'common_area', 'building', 'parking_spot']

// Internal roles that can manage units
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/units
 *
 * Returns all units with task statistics (open and total task counts).
 * For Imeri role: filters out units where tenant_visible_to_imeri=false
 *
 * Query params:
 * - building_id: Filter by building_id (uuid or 'all')
 *
 * Sorted by floor (descending, nulls last) then name
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<UnitsResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('building_id')

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Query units with optional building filter
    let query = supabase
      .from('units')
      .select('*')
      .order('floor', { ascending: false, nullsFirst: false })
      .order('name', { ascending: true })

    // Apply building filter if provided and not 'all'
    if (buildingId && buildingId !== 'all') {
      query = query.eq('building_id', buildingId)
    }

    const { data: units, error: unitsError } = await query

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

/**
 * POST /api/units - Create a new unit
 *
 * Body: CreateUnitInput
 *
 * Validates:
 * - building_id is required
 * - name is required
 * - unit_type is required and valid enum value
 */
export async function POST(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only internal roles can create units
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: CreateUnitInput = await request.json()

    // Validate required fields
    if (!body.building_id) {
      return NextResponse.json(
        { error: 'building_id is required' },
        { status: 400 }
      )
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    if (!body.unit_type) {
      return NextResponse.json(
        { error: 'unit_type is required' },
        { status: 400 }
      )
    }

    if (!VALID_UNIT_TYPES.includes(body.unit_type)) {
      return NextResponse.json(
        { error: `unit_type must be one of: ${VALID_UNIT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create unit with defaults
    // Only use columns that exist in the base schema (001_initial_schema.sql)
    const { data: unit, error: createError } = await supabase
      .from('units')
      .insert({
        building_id: body.building_id,
        name: body.name.trim(),
        unit_type: body.unit_type,
        floor: body.floor ?? null,
        position: body.position?.trim() || null,
        tenant_name: body.tenant_name?.trim() || null,
        tenant_visible_to_imeri: body.tenant_visible_to_imeri !== undefined ? body.tenant_visible_to_imeri : true,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating unit:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Return unit with stats (0 for new unit)
    const unitWithStats: UnitWithStats = {
      ...unit,
      open_tasks_count: 0,
      total_tasks_count: 0,
    }

    return NextResponse.json({ unit: unitWithStats }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/units:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
