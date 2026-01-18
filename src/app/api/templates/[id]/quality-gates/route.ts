import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateTemplateQualityGateInput } from '@/types/templates'
import type { Role } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id]/quality-gates - List quality gates
 *
 * Returns all quality gates for a template with phase/package references.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('template_quality_gates')
      .select(`
        *,
        phase:template_phases(id, name, wbs_code),
        package:template_packages(id, name, wbs_code)
      `)
      .eq('template_id', id)
      .order('created_at')

    if (error) {
      console.error('Error fetching quality gates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quality_gates: data })
  } catch (error) {
    console.error('Unexpected error in GET /api/templates/[id]/quality-gates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates/[id]/quality-gates - Create quality gate
 *
 * Admin only (kewa role)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id: templateId } = await params
    const body: Omit<CreateTemplateQualityGateInput, 'template_id'> = await request.json()

    // Validate required fields
    if (!body.name || !body.gate_level) {
      return NextResponse.json(
        { error: 'name and gate_level are required' },
        { status: 400 }
      )
    }

    // Validate gate has correct parent reference
    if (body.gate_level === 'phase' && !body.phase_id) {
      return NextResponse.json(
        { error: 'phase_id required for phase-level gate' },
        { status: 400 }
      )
    }
    if (body.gate_level === 'package' && !body.package_id) {
      return NextResponse.json(
        { error: 'package_id required for package-level gate' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('template_quality_gates')
      .insert({
        template_id: templateId,
        gate_level: body.gate_level,
        phase_id: body.phase_id || null,
        package_id: body.package_id || null,
        name: body.name,
        description: body.description,
        checklist_items: body.checklist_items || [],
        min_photos_required: body.min_photos_required || 0,
        photo_types: body.photo_types || ['completion'],
        is_blocking: body.is_blocking ?? false,
        auto_approve_when_complete: body.auto_approve_when_complete ?? true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating quality gate:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quality_gate: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/templates/[id]/quality-gates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
