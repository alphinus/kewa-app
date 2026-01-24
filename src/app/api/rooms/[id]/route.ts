/**
 * Rooms API - Single Resource Routes
 *
 * GET /api/rooms/[id] - Get room by ID
 * PATCH /api/rooms/[id] - Update room fields
 * DELETE /api/rooms/[id] - Delete room (kewa only)
 *
 * Phase 15-02: Room API CRUD Operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role, RoomType } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Valid room types from enum
 */
const VALID_ROOM_TYPES: RoomType[] = [
  'living_room',
  'bedroom',
  'kitchen',
  'bathroom',
  'hallway',
  'balcony',
  'storage',
  'laundry',
  'garage',
  'office',
  'other'
]

/**
 * Allowed fields for PATCH update
 */
interface UpdateRoomInput {
  name?: string
  room_type?: RoomType
  area_sqm?: number | null
  notes?: string | null
  // Note: condition is NOT updatable via API - managed by Digital Twin
}

/**
 * GET /api/rooms/[id] - Get room by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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

    // Only kewa and imeri can view rooms
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
        { error: 'Invalid room ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching room:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ room })
  } catch (error) {
    console.error('Unexpected error in GET /api/rooms/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/rooms/[id] - Update room fields
 *
 * Allowed updates:
 * - name, room_type, area_sqm, notes
 *
 * NOT allowed:
 * - condition (managed by Digital Twin automation)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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

    // Only kewa and imeri can update rooms
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
        { error: 'Invalid room ID format' },
        { status: 400 }
      )
    }

    const body: UpdateRoomInput = await request.json()

    // Don't allow empty update
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check room exists
    const { data: existing, error: checkError } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Room not found' },
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

    if (body.room_type !== undefined) {
      if (!VALID_ROOM_TYPES.includes(body.room_type)) {
        return NextResponse.json(
          { error: `room_type must be one of: ${VALID_ROOM_TYPES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.room_type = body.room_type
    }

    if (body.area_sqm !== undefined) {
      if (body.area_sqm !== null && (typeof body.area_sqm !== 'number' || body.area_sqm < 0)) {
        return NextResponse.json(
          { error: 'area_sqm must be a positive number or null' },
          { status: 400 }
        )
      }
      updateData.area_sqm = body.area_sqm
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update room
    const { data: room, error: updateError } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating room:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ room })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/rooms/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/rooms/[id] - Delete room
 *
 * Only kewa (admin) role can delete rooms.
 * Logs warning if room has condition_history entries.
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
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

    // Only kewa (admin) can delete rooms
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
        { error: 'Invalid room ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check room exists
    const { data: existing, error: checkError } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('id', id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Check for condition history (soft validation warning)
    const { data: historyEntries, error: historyError } = await supabase
      .from('condition_history')
      .select('id')
      .eq('entity_type', 'room')
      .eq('entity_id', id)
      .limit(1)

    if (!historyError && historyEntries && historyEntries.length > 0) {
      console.warn(`Deleting room ${id} (${existing.name}) with condition history entries`)
    }

    // Delete room
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting room:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/rooms/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
