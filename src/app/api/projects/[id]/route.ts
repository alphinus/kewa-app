import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ProjectWithUnit, ProjectResponse, ErrorResponse } from '@/types/database'
import type { Role } from '@/types'

/**
 * GET /api/projects/[id]
 *
 * Returns a single project with unit info.
 * For Imeri role: returns 403 if visible_to_imeri=false
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ProjectResponse | ErrorResponse>> {
  try {
    const { id: projectId } = await params
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

    // Fetch project with unit info
    const { data: project, error: projectError } = await supabase
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
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projekt nicht gefunden' },
        { status: 404 }
      )
    }

    // For Imeri, check visibility
    if (userRole === 'imeri' && !project.visible_to_imeri) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      )
    }

    // Transform to ProjectWithUnit
    const transformedProject: ProjectWithUnit = {
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
    }

    return NextResponse.json({ project: transformedProject })
  } catch (error) {
    console.error('Unexpected error in GET /api/projects/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
