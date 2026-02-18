import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type {
  TaskWithProject,
  TasksResponse,
  TaskResponse,
  CreateTaskInput,
  ErrorResponse,
  Task,
} from '@/types/database'
import type { Role } from '@/types'

/**
 * GET /api/tasks
 *
 * Returns all tasks with project and unit info.
 * Supports query params: ?status=open|completed, ?project_id=uuid, ?unit_id=uuid, ?building_id=uuid
 * For Imeri role: filters to visible_to_imeri=true projects only
 *
 * Sorted by: due_date (nulls last), priority (urgent first), created_at
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<TasksResponse | ErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)

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
    const statusFilter = searchParams.get('status')
    const projectIdFilter = searchParams.get('project_id')
    const unitIdFilter = searchParams.get('unit_id')
    const buildingIdFilter = searchParams.get('building_id')

    // Build query for tasks with project and unit info (including building_id for filtering)
    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:projects (
          id,
          name,
          unit_id,
          visible_to_imeri,
          unit:units (
            id,
            name,
            unit_type,
            floor,
            building_id
          )
        )
      `)

    // Apply filters
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    if (projectIdFilter) {
      query = query.eq('project_id', projectIdFilter)
    }

    const { data: tasks, error: tasksError } = await query

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      )
    }

    // Transform and filter tasks
    let transformedTasks: TaskWithProject[] = (tasks || [])
      .filter(task => {
        // Filter by building_id if specified (via project -> unit -> building chain)
        // 'all' or missing building_id = no filter (backward compatible)
        if (buildingIdFilter && buildingIdFilter !== 'all' && task.project?.unit?.building_id !== buildingIdFilter) {
          return false
        }
        // Filter by unit_id if specified
        if (unitIdFilter && task.project?.unit_id !== unitIdFilter) {
          return false
        }
        // For Imeri, filter out tasks from non-visible projects
        if (userRole === 'imeri' && !task.project?.visible_to_imeri) {
          return false
        }
        return true
      })
      .map(task => ({
        id: task.id,
        project_id: task.project_id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        completed_at: task.completed_at,
        completion_note: task.completion_note,
        recurring_type: task.recurring_type,
        created_at: task.created_at,
        updated_at: task.updated_at,
        project: {
          id: task.project?.id || '',
          name: task.project?.name || '',
          unit_id: task.project?.unit_id || '',
          visible_to_imeri: task.project?.visible_to_imeri ?? true,
        },
        unit: {
          id: task.project?.unit?.id || '',
          name: task.project?.unit?.name || '',
          unit_type: task.project?.unit?.unit_type || 'apartment',
          floor: task.project?.unit?.floor ?? null,
          building_id: task.project?.unit?.building_id || null,
        },
      }))

    // Sort: due_date (nulls last), priority (urgent first), created_at
    const priorityOrder: Record<string, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
      low: 3,
    }

    transformedTasks.sort((a, b) => {
      // due_date comparison (nulls last)
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1
      if (a.due_date && b.due_date) {
        const dateCompare = a.due_date.localeCompare(b.due_date)
        if (dateCompare !== 0) return dateCompare
      }

      // Priority comparison (urgent first)
      const priorityCompare = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityCompare !== 0) return priorityCompare

      // created_at comparison
      return a.created_at.localeCompare(b.created_at)
    })

    return NextResponse.json({ tasks: transformedTasks })
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks:', error)
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
 * POST /api/tasks
 *
 * Creates a new task.
 * Accepts: { project_id, title, description?, due_date?, priority? }
 * Defaults: status='open', priority='normal'
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<TaskResponse | ErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: CreateTaskInput = await request.json()

    // Validate required fields
    if (!body.project_id || !body.title) {
      return NextResponse.json(
        { error: 'project_id and title are required' },
        { status: 400 }
      )
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', body.project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Create task with defaults
    const taskData: Partial<Task> = {
      project_id: body.project_id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: 'open',
      priority: body.priority || 'normal',
      due_date: body.due_date || null,
      recurring_type: body.recurring_type || 'none',
    }

    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating task:', createError)
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      )
    }

    return NextResponse.json({ task: newTask }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/tasks:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
