import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Role } from '@/types'

interface CreateRenovationProjectInput {
  unit_id: string
  name: string
  description?: string
  planned_start_date?: string
  visible_to_imeri?: boolean
}

/**
 * POST /api/renovation-projects - Create new renovation project
 *
 * Creates a renovation project in 'planned' status ready for template application.
 * Admin only (kewa role).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Only KEWA can create renovation projects' },
        { status: 403 }
      )
    }

    const body: CreateRenovationProjectInput = await request.json()

    // Validate required fields
    if (!body.unit_id || !body.name) {
      return NextResponse.json(
        { error: 'unit_id and name are required' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Verify unit exists
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('id')
      .eq('id', body.unit_id)
      .single()

    if (unitError || !unit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      )
    }

    // Create renovation project with 'planned' status
    const { data: project, error: createError } = await supabase
      .from('renovation_projects')
      .insert({
        unit_id: body.unit_id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        status: 'planned',
        planned_start_date: body.planned_start_date || null,
        visible_to_imeri: body.visible_to_imeri ?? true,
        created_by: userId
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating renovation project:', createError)
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      )
    }

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/renovation-projects:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
