import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UnitWithStats, UnitResponse, UpdateUnitInput, ErrorResponse } from '@/types/database'
import type { Role } from '@/types'

/**
 * GET /api/units/[id]
 *
 * Returns a single unit with task statistics (open and total task counts).
 * For Imeri role: returns 403 if tenant_visible_to_imeri=false
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UnitResponse | ErrorResponse>> {
  try {
    const { id } = await params
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

    // Fetch single unit by ID
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .single()

    if (unitError) {
      if (unitError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Unit not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching unit:', unitError)
      return NextResponse.json(
        { error: 'Failed to fetch unit' },
        { status: 500 }
      )
    }

    // For Imeri, check if tenant is visible
    if (userRole === 'imeri' && !unit.tenant_visible_to_imeri) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get task counts for this unit via projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        visible_to_imeri,
        tasks (
          id,
          status
        )
      `)
      .eq('unit_id', id)

    if (projectsError) {
      console.error('Error fetching projects with tasks:', projectsError)
      return NextResponse.json(
        { error: 'Failed to fetch task statistics' },
        { status: 500 }
      )
    }

    // Calculate task counts
    let openTasksCount = 0
    let totalTasksCount = 0

    for (const project of projects || []) {
      // For Imeri, skip projects that are not visible
      if (userRole === 'imeri' && !project.visible_to_imeri) {
        continue
      }

      const tasks = project.tasks || []
      for (const task of tasks as Array<{ id: string; status: string }>) {
        totalTasksCount++
        if (task.status === 'open') {
          openTasksCount++
        }
      }
    }

    // Build UnitWithStats response
    const unitWithStats: UnitWithStats = {
      ...unit,
      open_tasks_count: openTasksCount,
      total_tasks_count: totalTasksCount,
    }

    return NextResponse.json({ unit: unitWithStats })
  } catch (error) {
    console.error('Unexpected error in GET /api/units/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/units/[id]
 *
 * Updates unit tenant_name and/or tenant_visible_to_imeri.
 * KEWA role only - Imeri cannot modify units.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UnitResponse | ErrorResponse>> {
  try {
    const { id } = await params
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

    // Only KEWA can update units
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Only KEWA can update units' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: UpdateUnitInput = await request.json()

    // Validate that at least one field is provided
    if (body.tenant_name === undefined && body.tenant_visible_to_imeri === undefined) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (body.tenant_name !== undefined) {
      updateData.tenant_name = body.tenant_name
    }
    if (body.tenant_visible_to_imeri !== undefined) {
      updateData.tenant_visible_to_imeri = body.tenant_visible_to_imeri
    }

    // Update unit in database
    const { data: updatedUnit, error: updateError } = await supabase
      .from('units')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Unit not found' },
          { status: 404 }
        )
      }
      console.error('Error updating unit:', updateError)
      return NextResponse.json(
        { error: 'Failed to update unit' },
        { status: 500 }
      )
    }

    // Get task counts for response (same pattern as GET)
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        tasks (
          id,
          status
        )
      `)
      .eq('unit_id', id)

    if (projectsError) {
      console.error('Error fetching projects with tasks:', projectsError)
      return NextResponse.json(
        { error: 'Failed to fetch task statistics' },
        { status: 500 }
      )
    }

    // Calculate task counts (KEWA sees all projects)
    let openTasksCount = 0
    let totalTasksCount = 0

    for (const project of projects || []) {
      const tasks = project.tasks || []
      for (const task of tasks as Array<{ id: string; status: string }>) {
        totalTasksCount++
        if (task.status === 'open') {
          openTasksCount++
        }
      }
    }

    // Build UnitWithStats response
    const unitWithStats: UnitWithStats = {
      ...updatedUnit,
      open_tasks_count: openTasksCount,
      total_tasks_count: totalTasksCount,
    }

    return NextResponse.json({ unit: unitWithStats })
  } catch (error) {
    console.error('Unexpected error in PUT /api/units/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
