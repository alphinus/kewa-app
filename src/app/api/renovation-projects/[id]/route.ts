import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/renovation-projects/[id] - Get single renovation project
 *
 * Returns project details with unit information.
 * Used by template application page to verify project status.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createOrgClient(request)

    const { data, error } = await supabase
      .from('renovation_projects')
      .select(`
        id,
        name,
        description,
        status,
        template_id,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        created_at,
        updated_at,
        unit:units (
          id,
          name,
          unit_type,
          floor
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      console.error('Error fetching renovation project:', error)
      return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
    }

    return NextResponse.json({ project: data })
  } catch (error) {
    console.error('Unexpected error in GET /api/renovation-projects/[id]:', error)
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
 * PATCH /api/renovation-projects/[id] - Update renovation project
 *
 * Updates project details. Admin only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userRole !== 'kewa') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await createOrgClient(request)

    // Only allow updating specific fields
    const allowedFields = [
      'name',
      'description',
      'status',
      'planned_start_date',
      'planned_end_date',
      'actual_start_date',
      'actual_end_date',
      'approved_by',
      'approved_at'
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('renovation_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      console.error('Error updating renovation project:', error)
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
    }

    return NextResponse.json({ project: data })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/renovation-projects/[id]:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
