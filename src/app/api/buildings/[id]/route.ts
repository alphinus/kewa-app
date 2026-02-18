/**
 * Buildings API - Single Resource Routes
 *
 * GET /api/buildings/[id] - Get building by ID
 * PATCH /api/buildings/[id] - Update building fields
 * DELETE /api/buildings/[id] - Delete building
 *
 * Phase 14-01: Property & Building CRUD Operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Allowed fields for PATCH update
 */
interface UpdateBuildingInput {
  name?: string
  address?: string | null
  property_id?: string
}

/**
 * GET /api/buildings/[id] - Get building by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only kewa and imeri can view buildings
    if (userRole !== 'kewa' && userRole !== 'imeri') {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid building ID format' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    const { data: building, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Building not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching building:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ building })
  } catch (error) {
    console.error('Unexpected error in GET /api/buildings/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/buildings/[id] - Update building fields
 *
 * Allowed updates:
 * - name (required if provided, min 1 char)
 * - address (optional)
 * - property_id (optional - allows moving building to different property)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only kewa and imeri can update buildings
    if (userRole !== 'kewa' && userRole !== 'imeri') {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid building ID format' },
        { status: 400 }
      )
    }

    const body: UpdateBuildingInput = await request.json()

    // Don't allow empty update
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Check building exists
    const { data: existing, error: checkError } = await supabase
      .from('buildings')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      )
    }

    // Build update object (only include allowed fields)
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (!body.name || !body.name.trim()) {
        return NextResponse.json(
          { error: 'name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (body.address !== undefined) {
      updateData.address = body.address?.trim() || null
    }

    if (body.property_id !== undefined) {
      // Validate property_id format
      if (!UUID_REGEX.test(body.property_id)) {
        return NextResponse.json(
          { error: 'Invalid property_id format' },
          { status: 400 }
        )
      }

      // Verify target property exists
      const { data: targetProperty, error: propertyError } = await supabase
        .from('properties')
        .select('id')
        .eq('id', body.property_id)
        .single()

      if (propertyError || !targetProperty) {
        return NextResponse.json(
          { error: 'Target property not found' },
          { status: 404 }
        )
      }

      updateData.property_id = body.property_id
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update building
    const { data: building, error: updateError } = await supabase
      .from('buildings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating building:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ building })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/buildings/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/buildings/[id] - Delete building
 *
 * Only kewa (admin) role can delete buildings.
 * Warning logged if building has associated units (cascade delete will remove them).
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only kewa (admin) can delete buildings
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: 'Invalid building ID format' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Check building exists
    const { data: existing, error: checkError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      )
    }

    // Check for associated units (soft validation warning)
    const { count: unitCount, error: countError } = await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .eq('building_id', id)

    if (!countError && unitCount && unitCount > 0) {
      console.warn(
        `Deleting building ${id} (${existing.name}) with ${unitCount} associated unit(s). ` +
        `CASCADE will delete all units and related data.`
      )
    }

    // Delete building (ON DELETE CASCADE handles units)
    const { error: deleteError } = await supabase
      .from('buildings')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting building:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/buildings/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
