/**
 * Building Heatmap API
 *
 * GET /api/buildings/[id]/heatmap
 *
 * Returns unit condition data for building heatmap visualization.
 * KEWA/Imeri access only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role, RoomCondition } from '@/types'

const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

interface HeatmapUnit {
  id: string
  name: string
  floor: number | null
  position: string | null
  unit_type: string
  tenant_name: string | null
  total_rooms: number
  new_rooms: number
  partial_rooms: number
  old_rooms: number
  renovation_percentage: number | null
  overall_condition: RoomCondition | null
  rooms: Array<{
    id: string
    name: string
    room_type: string
    condition: RoomCondition
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id: buildingId } = await params

    if (!buildingId) {
      return NextResponse.json(
        { error: 'buildingId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify building exists
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('id, name')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      )
    }

    // Fetch unit condition summaries
    const { data: summaries } = await supabase
      .from('unit_condition_summary')
      .select('*')
      .eq('building_id', buildingId)

    // Fetch units with room details
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select(`
        id, name, floor, position, unit_type, tenant_name,
        rooms (id, name, room_type, condition)
      `)
      .eq('building_id', buildingId)
      .eq('unit_type', 'apartment')
      .order('floor', { ascending: false })

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
      return NextResponse.json({ error: unitsError.message }, { status: 500 })
    }

    // Merge unit data with condition summary
    const heatmapUnits: HeatmapUnit[] = (units || []).map(unit => {
      const summary = (summaries || []).find(s => s.unit_id === unit.id)
      const rooms = (unit.rooms || []) as Array<{
        id: string
        name: string
        room_type: string
        condition: RoomCondition
      }>

      return {
        id: unit.id,
        name: unit.name,
        floor: unit.floor,
        position: unit.position,
        unit_type: unit.unit_type,
        tenant_name: unit.tenant_name,
        total_rooms: summary?.total_rooms || rooms.length,
        new_rooms: summary?.new_rooms || 0,
        partial_rooms: summary?.partial_rooms || 0,
        old_rooms: summary?.old_rooms || 0,
        renovation_percentage: summary?.renovation_percentage || 0,
        overall_condition: summary?.overall_condition || null,
        rooms
      }
    })

    return NextResponse.json({
      buildingId,
      buildingName: building.name,
      units: heatmapUnits
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/buildings/[id]/heatmap:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
