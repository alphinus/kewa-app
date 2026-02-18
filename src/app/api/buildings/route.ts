/**
 * Buildings API - Collection Routes
 *
 * GET /api/buildings - List all buildings (with optional property filter)
 * POST /api/buildings - Create a new building
 *
 * Phase 13: Partner-Modul - Property & Building Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import type { Building } from '@/types/database'

const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

export interface BuildingWithUnitCount extends Building {
  unit_count: number
}

/**
 * GET /api/buildings - List all buildings
 *
 * Query params:
 * - property_id: Filter by property
 */
export async function GET(request: NextRequest) {
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

    const supabase = await createOrgClient(request)
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')

    let query = supabase
      .from('buildings')
      .select('*, units(id)')
      .order('name', { ascending: true })

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching buildings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map to include unit count
    const buildings: BuildingWithUnitCount[] = (data || []).map(b => ({
      id: b.id,
      name: b.name,
      address: b.address,
      property_id: b.property_id,
      created_at: b.created_at,
      updated_at: b.updated_at,
      unit_count: Array.isArray(b.units) ? b.units.length : 0
    }))

    return NextResponse.json({ buildings })
  } catch (error) {
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    console.error('Unexpected error in GET /api/buildings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/buildings - Create a new building
 *
 * Body:
 * - name (required)
 * - property_id (required)
 * - address (optional)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!body.property_id) {
      return NextResponse.json({ error: 'property_id is required' }, { status: 400 })
    }

    const supabase = await createOrgClient(request)

    // Verify property exists
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', body.property_id)
      .single()

    if (propertyError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const { data: building, error: createError } = await supabase
      .from('buildings')
      .insert({
        name: body.name.trim(),
        property_id: body.property_id,
        address: body.address?.trim() || null
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating building:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ building }, { status: 201 })
  } catch (error) {
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    console.error('Unexpected error in POST /api/buildings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
