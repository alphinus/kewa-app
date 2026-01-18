import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface ApplyTemplateBody {
  project_id: string
  start_date?: string
  excluded_task_ids?: string[]
}

/**
 * POST /api/templates/[id]/apply - Apply template to project
 *
 * Applies a template to a renovation project in 'planned' status.
 * Creates phases, packages, tasks, dependencies, and quality gates
 * with proper ID remapping.
 *
 * Admin only (kewa role).
 *
 * @body project_id - Target project UUID (required)
 * @body start_date - Optional start date (YYYY-MM-DD)
 * @body excluded_task_ids - Optional array of task IDs to exclude
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin and property_manager can apply templates
    if (userRole !== 'kewa') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { id: templateId } = await params
    const body: ApplyTemplateBody = await request.json()

    if (!body.project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify template exists and is active
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id, name, is_active')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (!template.is_active) {
      return NextResponse.json(
        { error: 'Template is not active' },
        { status: 400 }
      )
    }

    // Verify project exists and is in 'planned' status
    const { data: project, error: projectError } = await supabase
      .from('renovation_projects')
      .select('id, name, status, template_id')
      .eq('id', body.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.status !== 'planned') {
      return NextResponse.json(
        { error: 'Template can only be applied to projects in planned status' },
        { status: 400 }
      )
    }

    if (project.template_id) {
      return NextResponse.json(
        { error: 'Project already has a template applied' },
        { status: 400 }
      )
    }

    // Apply template using the PostgreSQL function
    const { data, error } = await supabase.rpc('apply_template_to_project', {
      p_template_id: templateId,
      p_project_id: body.project_id,
      p_start_date: body.start_date || null,
      p_excluded_tasks: body.excluded_task_ids || []
    })

    if (error) {
      console.error('Template application error:', error)
      return NextResponse.json(
        { error: 'Failed to apply template: ' + error.message },
        { status: 500 }
      )
    }

    const result = data[0]

    return NextResponse.json({
      success: true,
      applied: {
        template_id: templateId,
        template_name: template.name,
        project_id: body.project_id,
        phases_created: result.phases_created,
        packages_created: result.packages_created,
        tasks_created: result.tasks_created,
        dependencies_created: result.dependencies_created,
        gates_created: result.gates_created
      }
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/templates/[id]/apply:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
