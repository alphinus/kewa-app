import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import { detectCircularDependency } from '@/lib/templates/dependencies'
import type { Role } from '@/types'
import type { CreateTemplateDependencyInput, DependencyType } from '@/types/templates'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/[id]/dependencies - List dependencies for a template
 *
 * Returns all task dependencies defined in the template.
 * All authenticated users can view.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createOrgClient(request)

    const { data, error } = await supabase
      .from('template_dependencies')
      .select('*')
      .eq('template_id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ dependencies: data })
  } catch (error) {
    console.error('Error in GET /api/templates/[id]/dependencies:', error)
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
 * POST /api/templates/[id]/dependencies - Create dependency (admin only)
 *
 * Creates a new task dependency in the template.
 * Validates for circular dependencies before creating.
 *
 * @body predecessor_task_id - Task that must complete first
 * @body successor_task_id - Task that depends on predecessor
 * @body dependency_type - FS (Finish-to-Start), SS, FF, or SF
 * @body lag_days - Days to wait after dependency condition (can be negative)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userRole !== 'kewa') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: templateId } = await params
    const body: Omit<CreateTemplateDependencyInput, 'template_id'> = await request.json()

    if (!body.predecessor_task_id || !body.successor_task_id) {
      return NextResponse.json(
        { error: 'predecessor_task_id and successor_task_id are required' },
        { status: 400 }
      )
    }

    // Self-reference check
    if (body.predecessor_task_id === body.successor_task_id) {
      return NextResponse.json(
        { error: 'Task cannot depend on itself' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    // Verify template exists
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get existing dependencies
    const { data: existing } = await supabase
      .from('template_dependencies')
      .select('predecessor_task_id, successor_task_id')
      .eq('template_id', templateId)

    // Check for circular dependency
    const proposed = [
      ...(existing || []),
      {
        predecessor_task_id: body.predecessor_task_id,
        successor_task_id: body.successor_task_id
      }
    ]

    const circularCheck = detectCircularDependency(proposed)
    if (circularCheck.hasCircle) {
      return NextResponse.json(
        {
          error: 'Circular dependency detected',
          cycle: circularCheck.cycle
        },
        { status: 400 }
      )
    }

    // Create dependency
    const { data, error } = await supabase
      .from('template_dependencies')
      .insert({
        template_id: templateId,
        predecessor_task_id: body.predecessor_task_id,
        successor_task_id: body.successor_task_id,
        dependency_type: body.dependency_type || 'FS',
        lag_days: body.lag_days || 0
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Dependency already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ dependency: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/templates/[id]/dependencies:', error)
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
 * DELETE /api/templates/[id]/dependencies - Delete a dependency (admin only)
 *
 * Deletes a dependency by ID (passed as query param ?dependency_id=xxx)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (userRole !== 'kewa') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: templateId } = await params
    const { searchParams } = new URL(request.url)
    const dependencyId = searchParams.get('dependency_id')

    if (!dependencyId) {
      return NextResponse.json(
        { error: 'dependency_id query parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createOrgClient(request)

    const { error } = await supabase
      .from('template_dependencies')
      .delete()
      .eq('id', dependencyId)
      .eq('template_id', templateId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/templates/[id]/dependencies:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
