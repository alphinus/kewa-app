/**
 * Properties API - Collection Routes
 *
 * GET /api/properties - List all properties with their buildings
 * POST /api/properties - Create a new property
 *
 * Phase 13: Partner Module - Property & Building Management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'
import type { Property, Building } from '@/types/database'

// Internal roles that can manage properties
const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * Property with buildings for selector
 */
export interface PropertyWithBuildings extends Property {
  buildings: Building[]
}

/**
 * GET /api/properties - List all properties with buildings
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

    // Only internal roles can view properties
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createOrgClient(request)

    // Fetch all properties
    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('*')
      .order('name', { ascending: true })

    if (propsError) {
      console.error('Error fetching properties:', propsError)
      return NextResponse.json({ error: propsError.message }, { status: 500 })
    }

    // Fetch all buildings
    const { data: buildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('*')
      .order('name', { ascending: true })

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError)
      return NextResponse.json({ error: buildingsError.message }, { status: 500 })
    }

    // Group buildings by property
    const propertiesWithBuildings: PropertyWithBuildings[] = (properties || []).map(property => ({
      ...property,
      buildings: (buildings || []).filter(building => building.property_id === property.id)
    }))

    return NextResponse.json({
      properties: propertiesWithBuildings,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/properties:', error)
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
 * POST /api/properties - Create a new property
 *
 * Body: CreatePropertyInput
 *
 * Validates:
 * - name is required
 * - name must not be empty
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

    // Only internal roles can create properties
    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Create property
    const { data: property, error: createError } = await supabase
      .from('properties')
      .insert({
        name: body.name.trim(),
        address: body.address?.trim() || null,
        description: body.description?.trim() || null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating property:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/properties:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
