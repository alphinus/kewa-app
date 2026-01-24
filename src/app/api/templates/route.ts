import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateTemplateInput } from '@/types/templates'
import type { Role } from '@/types'

/**
 * GET /api/templates - List all templates
 *
 * Query params:
 * - category: Filter by template_category
 * - scope: Filter by template_scope
 * - active: Filter by is_active (default: true)
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

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Filter options
    const category = searchParams.get('category')
    const scope = searchParams.get('scope')
    const activeOnly = searchParams.get('active') !== 'false'

    let query = supabase
      .from('templates')
      .select(`
        *,
        template_phases (
          id
        )
      `)
      .order('category')
      .order('name')

    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (scope) {
      query = query.eq('scope', scope)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data to include phase_count
    const templates = data.map((template: any) => ({
      ...template,
      phase_count: template.template_phases?.length || 0,
      template_phases: undefined
    }))

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Unexpected error in GET /api/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates - Create new template
 *
 * Admin only (kewa role)
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

    // Check admin permission
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body: CreateTemplateInput = await request.json()

    // Validate required fields
    if (!body.name || !body.category || !body.scope) {
      return NextResponse.json(
        { error: 'name, category, and scope are required' },
        { status: 400 }
      )
    }

    // Validate room scope requires target_room_type
    if (body.scope === 'room' && !body.target_room_type) {
      return NextResponse.json(
        { error: 'target_room_type required for room-scoped templates' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('templates')
      .insert({
        name: body.name,
        description: body.description,
        category: body.category,
        scope: body.scope,
        target_room_type: body.target_room_type,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
