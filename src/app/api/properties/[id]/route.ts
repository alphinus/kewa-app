/**
 * Properties API - Single Resource Routes
 *
 * GET /api/properties/[id] - Get property by ID
 * PATCH /api/properties/[id] - Update property fields
 * DELETE /api/properties/[id] - Delete property
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
interface UpdatePropertyInput {
  name?: string
  address?: string | null
  description?: string | null
}

/**
 * GET /api/properties/[id] - Get property by ID
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

    // Only kewa and imeri can view properties
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
        { error: 'Invalid property ID format' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    const { data: property, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching property:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ property })
  } catch (error) {
    console.error('Unexpected error in GET /api/properties/[id]:', error)
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
 * PATCH /api/properties/[id] - Update property fields
 *
 * Allowed updates:
 * - name (required if provided, min 1 char)
 * - address (optional)
 * - description (optional)
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

    // Only kewa and imeri can update properties
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
        { error: 'Invalid property ID format' },
        { status: 400 }
      )
    }

    const body: UpdatePropertyInput = await request.json()

    // Don't allow empty update
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Check property exists
    const { data: existing, error: checkError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Property not found' },
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

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update property
    const { data: property, error: updateError } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating property:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ property })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/properties/[id]:', error)
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
 * DELETE /api/properties/[id] - Delete property
 *
 * Only kewa (admin) role can delete properties.
 * Warning logged if property has associated buildings (cascade delete will remove them).
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

    // Only kewa (admin) can delete properties
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
        { error: 'Invalid property ID format' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Check property exists
    const { data: existing, error: checkError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Check for associated buildings (soft validation warning)
    const { count: buildingCount, error: countError } = await supabase
      .from('buildings')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', id)

    if (!countError && buildingCount && buildingCount > 0) {
      console.warn(
        `Deleting property ${id} (${existing.name}) with ${buildingCount} associated building(s). ` +
        `CASCADE will delete all buildings and their units.`
      )
    }

    // Delete property (ON DELETE CASCADE handles buildings/units)
    const { error: deleteError } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting property:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/properties/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
