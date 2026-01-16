import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  TaskWithProject,
  TaskResponse,
  UpdateTaskInput,
  SuccessResponse,
  ErrorResponse,
} from '@/types/database'
import type { Role } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/tasks/[id]
 *
 * Returns a single task by ID with project and unit info.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TaskResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch task with project and unit info
    const { data: task, error: taskError } = await supabase
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
            floor
          )
        )
      `)
      .eq('id', id)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // For Imeri, check if project is visible
    if (userRole === 'imeri' && !task.project?.visible_to_imeri) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Transform to TaskWithProject
    const taskWithProject: TaskWithProject = {
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
      },
    }

    return NextResponse.json({ task: taskWithProject })
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/tasks/[id]
 *
 * Updates an existing task.
 * Accepts partial UpdateTaskInput.
 * Handles status changes: completed sets completed_at, open clears it.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<TaskResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()
    const { id } = await params

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
    const body: UpdateTaskInput = await request.json()

    // Check if task exists
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) {
      updateData.title = body.title.trim()
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }
    if (body.priority !== undefined) {
      updateData.priority = body.priority
    }
    if (body.due_date !== undefined) {
      updateData.due_date = body.due_date
    }
    if (body.completion_note !== undefined) {
      updateData.completion_note = body.completion_note?.trim() || null
    }
    if (body.recurring_type !== undefined) {
      updateData.recurring_type = body.recurring_type
    }

    // Handle status changes
    if (body.status !== undefined) {
      updateData.status = body.status

      if (body.status === 'completed' && existingTask.status !== 'completed') {
        // Setting to completed: set completed_at to now
        updateData.completed_at = new Date().toISOString()
      } else if (body.status === 'open' && existingTask.status === 'completed') {
        // Reopening: clear completed_at
        updateData.completed_at = null
      }
    }

    // Perform update
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating task:', updateError)
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
    }

    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('Unexpected error in PUT /api/tasks/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tasks/[id]
 *
 * Deletes a task by ID.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if task exists
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Delete task
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting task:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/tasks/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
