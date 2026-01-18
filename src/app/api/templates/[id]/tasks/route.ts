import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateTemplateTaskInput } from '@/types/templates'
import type { Role } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id]/tasks - List tasks for a template
 *
 * Query params:
 * - package_id: Filter by specific package
 *
 * Returns tasks sorted by package and sort_order
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
    const packageId = searchParams.get('package_id')

    const supabase = await createClient()

    // Get all packages for this template through phases
    const { data: phases, error: phasesError } = await supabase
      .from('template_phases')
      .select('id')
      .eq('template_id', id)

    if (phasesError) {
      console.error('Error fetching phases:', phasesError)
      return NextResponse.json({ error: phasesError.message }, { status: 500 })
    }

    if (!phases || phases.length === 0) {
      return NextResponse.json({ tasks: [] })
    }

    const phaseIds = phases.map(p => p.id)

    // Get packages for those phases
    const { data: packages, error: packagesError } = await supabase
      .from('template_packages')
      .select('id')
      .in('phase_id', phaseIds)

    if (packagesError) {
      console.error('Error fetching packages:', packagesError)
      return NextResponse.json({ error: packagesError.message }, { status: 500 })
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json({ tasks: [] })
    }

    const packageIds = packages.map(p => p.id)

    // Fetch tasks for those packages
    let query = supabase
      .from('template_tasks')
      .select('*')
      .in('package_id', packageIds)
      .order('sort_order')

    if (packageId) {
      query = query.eq('package_id', packageId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks: data })
  } catch (error) {
    console.error('Unexpected error in GET /api/templates/[id]/tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates/[id]/tasks - Create task in template
 *
 * Admin only (kewa role)
 * Requires package_id in body
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
    const body: Omit<CreateTemplateTaskInput, 'template_id'> = await request.json()

    // Validate required fields
    if (!body.package_id || !body.name || !body.wbs_code) {
      return NextResponse.json(
        { error: 'package_id, name, and wbs_code are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify package belongs to this template (through phase)
    const { data: pkg, error: pkgError } = await supabase
      .from('template_packages')
      .select(`
        id,
        phase:template_phases!inner (
          template_id
        )
      `)
      .eq('id', body.package_id)
      .single()

    if (pkgError || !pkg) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 400 }
      )
    }

    // Verify the package's phase belongs to this template
    // Supabase returns single nested relations as arrays when using !inner join
    const phaseData = pkg.phase as unknown as { template_id: string }[] | { template_id: string }
    const phase = Array.isArray(phaseData) ? phaseData[0] : phaseData
    if (!phase || phase.template_id !== id) {
      return NextResponse.json(
        { error: 'Package not found in this template' },
        { status: 400 }
      )
    }

    // Get next sort_order if not provided
    let sortOrder = body.sort_order
    if (sortOrder === undefined) {
      const { data: existing } = await supabase
        .from('template_tasks')
        .select('sort_order')
        .eq('package_id', body.package_id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

      sortOrder = (existing?.sort_order ?? -1) + 1
    }

    const { data, error } = await supabase
      .from('template_tasks')
      .insert({
        package_id: body.package_id,
        name: body.name,
        description: body.description,
        wbs_code: body.wbs_code,
        sort_order: sortOrder,
        estimated_duration_days: body.estimated_duration_days ?? 1,
        estimated_cost: body.estimated_cost,
        trade_category: body.trade_category,
        is_optional: body.is_optional ?? false,
        materials_list: body.materials_list ?? [],
        notes: body.notes,
        checklist_template: body.checklist_template ?? []
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ task: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/templates/[id]/tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
