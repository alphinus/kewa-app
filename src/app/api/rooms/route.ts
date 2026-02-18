/**
 * Rooms API - Collection Routes
 *
 * POST /api/rooms - Create a new room
 * GET /api/rooms - List rooms (requires unit_id filter)
 *
 * Phase 15-02: Room API CRUD Operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role, RoomType } from '@/types'
import type { Room } from '@/types/database'

// Internal roles that can manage rooms
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

// Valid room types from enum
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
 * GET /api/rooms - List rooms for a unit
 *
 * Query params:
 * - unit_id: Required - filter rooms by unit
 */
export async function GET(request: NextRequest) {
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

    // Only internal roles can view rooms
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unitId = searchParams.get('unit_id')

    // unit_id is required for listing rooms
    if (!unitId) {
      return NextResponse.json(
        { error: 'unit_id query parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('unit_id', unitId)
      .order('room_type', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching rooms:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rooms = (data || []) as Room[]

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('Unexpected error in GET /api/rooms:', error)
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
 * POST /api/rooms - Create a new room
 *
 * Body: CreateRoomInput
 *
 * Validates:
 * - unit_id is required
 * - name is required
 * - room_type is required and must be valid enum value
 * - area_sqm is optional
 * - notes is optional
 *
 * Defaults:
 * - condition = 'old'
 * - condition_updated_at = null
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

    // Only internal roles can create rooms
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.unit_id) {
      return NextResponse.json(
        { error: 'unit_id is required' },
        { status: 400 }
      )
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    if (!body.room_type) {
      return NextResponse.json(
        { error: 'room_type is required' },
        { status: 400 }
      )
    }

    // Validate room_type is valid enum
    if (!VALID_ROOM_TYPES.includes(body.room_type)) {
      return NextResponse.json(
        { error: `room_type must be one of: ${VALID_ROOM_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate area_sqm if provided
    if (body.area_sqm !== undefined && body.area_sqm !== null) {
      if (typeof body.area_sqm !== 'number' || body.area_sqm < 0) {
        return NextResponse.json(
          { error: 'area_sqm must be a positive number' },
          { status: 400 }
        )
      }
    }

    const supabase = await createOrgClient(request)

    // Create room with defaults
    const { data: room, error: createError } = await supabase
      .from('rooms')
      .insert({
        unit_id: body.unit_id,
        name: body.name.trim(),
        room_type: body.room_type,
        area_sqm: body.area_sqm ?? null,
        notes: body.notes?.trim() || null,
        condition: 'old', // Default condition
        condition_updated_at: null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating room:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ room }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/rooms:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
