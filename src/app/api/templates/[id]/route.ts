import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { UpdateTemplateInput } from '@/types/templates'
import type { Role } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id] - Get template with full hierarchy
 *
 * Returns template with nested phases, packages, tasks, dependencies, and quality gates
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
    const supabase = await createOrgClient(request)

    // Fetch template with full nested hierarchy
    const { data, error } = await supabase
      .from('templates')
      .select(`
        *,
        phases:template_phases (
          *,
          packages:template_packages (
            *,
            tasks:template_tasks (*)
          )
        ),
        dependencies:template_dependencies (*),
        quality_gates:template_quality_gates (*)
      `)
      .eq('id', id)
      .order('sort_order', { referencedTable: 'template_phases' })
      .order('sort_order', { referencedTable: 'template_phases.template_packages' })
      .order('sort_order', { referencedTable: 'template_phases.template_packages.template_tasks' })
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Unexpected error in GET /api/templates/[id]:', error)
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
 * PATCH /api/templates/[id] - Update template
 *
 * Admin only (kewa role)
 */
export async function PATCH(
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
    const body: UpdateTemplateInput = await request.json()
    const supabase = await createOrgClient(request)

    // Validate room scope requires target_room_type
    if (body.scope === 'room' && body.target_room_type === null) {
      return NextResponse.json(
        { error: 'target_room_type required for room-scoped templates' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('templates')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
      console.error('Error updating template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/templates/[id]:', error)
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
 * DELETE /api/templates/[id] - Delete template
 *
 * Admin only (kewa role)
 * Cascades to all phases, packages, tasks, dependencies, and quality gates
 */
export async function DELETE(
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
    const supabase = await createOrgClient(request)

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/templates/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
