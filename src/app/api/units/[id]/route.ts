/**
 * Units API - Single Resource Routes
 *
 * GET /api/units/[id] - Get single unit with stats
 * PATCH /api/units/[id] - Update unit fields
 * DELETE /api/units/[id] - Delete unit (kewa only)
 *
 * Phase 15-01: Extended Unit API with full PATCH and DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UnitWithStats, UnitResponse, UpdateUnitInput, ErrorResponse, SuccessResponse } from '@/types/database'
import type { Role, UnitType } from '@/types'

// Valid unit types for validation
const VALID_UNIT_TYPES: UnitType[] = ['apartment', 'common_area', 'building', 'parking_spot']

// Internal roles that can manage units
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * Helper: Calculate task counts for a unit
 */
async function getUnitTaskCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  unitId: string,
  userRole: Role
): Promise<{ open: number; total: number }> {
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      visible_to_imeri,
      tasks (
        id,
        status
      )
    `)
    .eq('unit_id', unitId)

  if (error) {
    console.error('Error fetching projects with tasks:', error)
    return { open: 0, total: 0 }
  }

  let open = 0
  let total = 0

  for (const project of projects || []) {
    // For Imeri, skip projects that are not visible
    if (userRole === 'imeri' && !project.visible_to_imeri) {
      continue
    }

    const tasks = project.tasks || []
    for (const task of tasks as Array<{ id: string; status: string }>) {
      total++
      if (task.status === 'open') {
        open++
      }
    }
  }

  return { open, total }
}

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

    // Get task counts
    const taskCounts = await getUnitTaskCounts(supabase, id, userRole)

    // Build UnitWithStats response
    const unitWithStats: UnitWithStats = {
      ...unit,
      open_tasks_count: taskCounts.open,
      total_tasks_count: taskCounts.total,
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
 * PATCH /api/units/[id]
 *
 * Updates unit fields. Accepts partial updates.
 * KEWA and Imeri roles can update units.
 */
export async function PATCH(
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

    // Only internal roles can update units
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: UpdateUnitInput = await request.json()

    // Validate that at least one field is provided
    const updateableFields = [
      'name', 'unit_type', 'floor', 'position', 'unit_number', 'size_class',
      'tenant_name', 'tenant_phone', 'tenant_email', 'tenant_move_in_date',
      'is_vacant', 'vacancy_reason', 'tenant_visible_to_imeri'
    ]
    const hasUpdate = updateableFields.some(field => body[field as keyof UpdateUnitInput] !== undefined)

    if (!hasUpdate) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Validate unit_type if provided
    if (body.unit_type !== undefined && !VALID_UNIT_TYPES.includes(body.unit_type)) {
      return NextResponse.json(
        { error: `unit_type must be one of: ${VALID_UNIT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update object - only include fields that are provided
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      updateData.name = body.name?.trim() || null
    }
    if (body.unit_type !== undefined) {
      updateData.unit_type = body.unit_type
    }
    if (body.floor !== undefined) {
      updateData.floor = body.floor
    }
    if (body.position !== undefined) {
      updateData.position = body.position?.trim() || null
    }
    if (body.unit_number !== undefined) {
      updateData.unit_number = body.unit_number?.trim() || null
    }
    if (body.size_class !== undefined) {
      updateData.size_class = body.size_class?.trim() || null
    }
    if (body.tenant_name !== undefined) {
      updateData.tenant_name = body.tenant_name?.trim() || null
    }
    if (body.tenant_phone !== undefined) {
      updateData.tenant_phone = body.tenant_phone?.trim() || null
    }
    if (body.tenant_email !== undefined) {
      updateData.tenant_email = body.tenant_email?.trim() || null
    }
    if (body.tenant_move_in_date !== undefined) {
      updateData.tenant_move_in_date = body.tenant_move_in_date || null
    }
    if (body.is_vacant !== undefined) {
      updateData.is_vacant = body.is_vacant
    }
    if (body.vacancy_reason !== undefined) {
      updateData.vacancy_reason = body.vacancy_reason?.trim() || null
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

    // Get task counts
    const taskCounts = await getUnitTaskCounts(supabase, id, userRole)

    // Build UnitWithStats response
    const unitWithStats: UnitWithStats = {
      ...updatedUnit,
      open_tasks_count: taskCounts.open,
      total_tasks_count: taskCounts.total,
    }

    return NextResponse.json({ unit: unitWithStats })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/units/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/units/[id]
 *
 * Deletes a unit. KEWA role only for safety.
 * Logs warning if unit has related projects but proceeds (admin override).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
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

    // Only KEWA can delete units (admin-only for safety)
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete units' },
        { status: 403 }
      )
    }

    // Check if unit exists first
    const { data: existingUnit, error: fetchError } = await supabase
      .from('units')
      .select('id, name')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Unit not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching unit:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch unit' },
        { status: 500 }
      )
    }

    // Check for related projects (warning only, don't block)
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('unit_id', id)
      .limit(1)

    if (projects && projects.length > 0) {
      console.warn(`Warning: Deleting unit ${id} (${existingUnit.name}) which has related projects`)
    }

    // Delete the unit (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('units')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting unit:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete unit' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/units/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
