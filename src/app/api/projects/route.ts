import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  ProjectWithUnit,
  ProjectsResponse,
  ProjectResponse,
  CreateProjectInput,
  ErrorResponse,
  Project,
} from '@/types/database'
import type { Role } from '@/types'

/**
 * GET /api/projects
 *
 * Returns all projects with unit info.
 * For Imeri role: filters to visible_to_imeri=true projects only
 * Supports query params:
 * - ?unit_id=uuid to filter by unit
 * - ?include_archived=true to include archived projects (default: false)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ProjectsResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const unitIdFilter = searchParams.get('unit_id')
    const includeArchived = searchParams.get('include_archived') === 'true'

    // Build query for projects with unit info
    let query = supabase
      .from('projects')
      .select(`
        *,
        unit:units (
          id,
          name,
          unit_type,
          floor
        )
      `)
      .order('name', { ascending: true })

    // Filter archived projects unless explicitly requested
    if (!includeArchived) {
      query = query.neq('status', 'archived')
    }

    // Apply filters
    if (unitIdFilter) {
      query = query.eq('unit_id', unitIdFilter)
    }

    // For Imeri, filter to visible projects only
    if (userRole === 'imeri') {
      query = query.eq('visible_to_imeri', true)
    }

    const { data: projects, error: projectsError } = await query

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      )
    }

    // Transform to ProjectWithUnit
    const transformedProjects: ProjectWithUnit[] = (projects || []).map(project => ({
      id: project.id,
      unit_id: project.unit_id,
      name: project.name,
      description: project.description,
      status: project.status,
      visible_to_imeri: project.visible_to_imeri,
      archived_at: project.archived_at ?? null,
      created_at: project.created_at,
      unit: {
        id: project.unit?.id || '',
        name: project.unit?.name || '',
        unit_type: project.unit?.unit_type || 'apartment',
        floor: project.unit?.floor ?? null,
      },
    }))

    return NextResponse.json({ projects: transformedProjects })
  } catch (error) {
    console.error('Unexpected error in GET /api/projects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects
 *
 * Creates a new project.
 * Accepts: { unit_id, name, description?, visible_to_imeri? }
 * Defaults: status='active', visible_to_imeri=true
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ProjectResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only KEWA can create projects
    if (userRole !== 'kewa') {
      return NextResponse.json(
        { error: 'Only KEWA can create projects' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: CreateProjectInput = await request.json()

    // Validate required fields
    if (!body.unit_id || !body.name) {
      return NextResponse.json(
        { error: 'unit_id and name are required' },
        { status: 400 }
      )
    }

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

    // Create project with defaults
    const projectData: Partial<Project> = {
      unit_id: body.unit_id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      status: 'active',
      visible_to_imeri: body.visible_to_imeri ?? true,
    }

    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating project:', createError)
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      )
    }

    return NextResponse.json({ project: newProject }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/projects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
