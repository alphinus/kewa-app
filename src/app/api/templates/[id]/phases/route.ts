import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateTemplatePhaseInput } from '@/types/templates'
import type { Role } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id]/phases - List phases for a template
 *
 * Returns phases sorted by sort_order
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
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

    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('template_phases')
      .select('*')
      .eq('template_id', id)
      .order('sort_order')

    if (error) {
      console.error('Error fetching phases:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ phases: data })
  } catch (error) {
    console.error('Unexpected error in GET /api/templates/[id]/phases:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates/[id]/phases - Create phase in template
 *
 * Admin only (kewa role)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
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

    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body: Omit<CreateTemplatePhaseInput, 'template_id'> = await request.json()

    // Validate required fields
    if (!body.name || !body.wbs_code) {
      return NextResponse.json(
        { error: 'name and wbs_code are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get next sort_order if not provided
    let sortOrder = body.sort_order
    if (sortOrder === undefined) {
      const { data: existing } = await supabase
        .from('template_phases')
        .select('sort_order')
        .eq('template_id', id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      sortOrder = (existing?.sort_order ?? -1) + 1
    }

    const { data, error } = await supabase
      .from('template_phases')
      .insert({
        template_id: id,
        name: body.name,
        description: body.description,
        wbs_code: body.wbs_code,
        sort_order: sortOrder
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating phase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ phase: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/templates/[id]/phases:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
