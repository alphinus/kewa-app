import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { CreateTemplatePackageInput } from '@/types/templates'
import type { Role } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id]/packages - List packages for a template
 *
 * Query params:
 * - phase_id: Filter by specific phase
 *
 * Returns packages sorted by phase and sort_order
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
    const { searchParams } = new URL(request.url)
    const phaseId = searchParams.get('phase_id')

    const supabase = await createOrgClient(request)

    // First get phases for this template
    const { data: phases, error: phasesError } = await supabase
      .from('template_phases')
      .select('id')
      .eq('template_id', id)

    if (phasesError) {
      console.error('Error fetching phases:', phasesError)
      return NextResponse.json({ error: phasesError.message }, { status: 500 })
    }

    if (!phases || phases.length === 0) {
      return NextResponse.json({ packages: [] })
    }

    const phaseIds = phases.map(p => p.id)

    // Fetch packages for those phases
    let query = supabase
      .from('template_packages')
      .select('*')
      .in('phase_id', phaseIds)
      .order('sort_order')

    if (phaseId) {
      query = query.eq('phase_id', phaseId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching packages:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ packages: data })
  } catch (error) {
    console.error('Unexpected error in GET /api/templates/[id]/packages:', error)
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
 * POST /api/templates/[id]/packages - Create package in template
 *
 * Admin only (kewa role)
 * Requires phase_id in body
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
    const body: Omit<CreateTemplatePackageInput, 'template_id'> = await request.json()

    // Validate required fields
    if (!body.phase_id || !body.name || !body.wbs_code) {
      return NextResponse.json(
        { error: 'phase_id, name, and wbs_code are required' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Verify phase belongs to this template
    const { data: phase, error: phaseError } = await supabase
      .from('template_phases')
      .select('id')
      .eq('id', body.phase_id)
      .eq('template_id', id)
      .single()

    if (phaseError || !phase) {
      return NextResponse.json(
        { error: 'Phase not found in this template' },
        { status: 400 }
      )
    }

    // Get next sort_order if not provided
    let sortOrder = body.sort_order
    if (sortOrder === undefined) {
      const { data: existing } = await supabase
        .from('template_packages')
        .select('sort_order')
        .eq('phase_id', body.phase_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      sortOrder = (existing?.sort_order ?? -1) + 1
    }

    const { data, error } = await supabase
      .from('template_packages')
      .insert({
        phase_id: body.phase_id,
        name: body.name,
        description: body.description,
        wbs_code: body.wbs_code,
        sort_order: sortOrder,
        trade_category: body.trade_category
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating package:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ package: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/templates/[id]/packages:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
