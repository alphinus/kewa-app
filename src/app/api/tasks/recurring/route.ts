import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import type { Task, TaskResponse, ErrorResponse } from '@/types/database'

interface RecurringTaskInput {
  completed_task_id: string
}

/**
 * Calculates the next due date based on recurring type
 * @param baseDate - The original due date or completed_at date
 * @param recurringType - 'weekly' or 'monthly'
 * @returns ISO date string for next due date
 */
function calculateNextDueDate(baseDate: string, recurringType: 'weekly' | 'monthly'): string {
  const date = new Date(baseDate)

  if (recurringType === 'weekly') {
    // Add 7 days
    date.setDate(date.getDate() + 7)
  } else if (recurringType === 'monthly') {
    // Add 1 month
    date.setMonth(date.getMonth() + 1)
  }

  // Return as ISO date (YYYY-MM-DD format)
  return date.toISOString().split('T')[0]
}

/**
 * POST /api/tasks/recurring
 *
 * Creates a new recurring task instance when the previous one is completed.
 * Accepts: { completed_task_id: string }
 *
 * - Fetches the completed task
 * - Verifies it has recurring_type !== 'none'
 * - Calculates next due date (weekly=+7 days, monthly=+1 month)
 * - Creates new task copying core fields
 * - Returns the new task
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<TaskResponse | ErrorResponse>> {
  try {
    const supabase = await createOrgClient(request)

    // Parse request body
    const body: RecurringTaskInput = await request.json()

    if (!body.completed_task_id) {
      return NextResponse.json(
        { error: 'completed_task_id is required' },
        { status: 400 }
      )
    }

    // Fetch the completed task with project info
    const { data: completedTask, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        id,
        project_id,
        title,
        description,
        priority,
        due_date,
        completed_at,
        recurring_type,
        project:projects (
          id,
          name
        )
      `)
      .eq('id', body.completed_task_id)
      .single()

    if (fetchError || !completedTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Verify task has recurring type
    if (completedTask.recurring_type === 'none' || !completedTask.recurring_type) {
      return NextResponse.json(
        { error: 'Task is not recurring' },
        { status: 400 }
      )
    }

    // Calculate next due date
    // Use original due_date if available, otherwise use completed_at
    const baseDate = completedTask.due_date || completedTask.completed_at || new Date().toISOString()
    const nextDueDate = calculateNextDueDate(baseDate, completedTask.recurring_type as 'weekly' | 'monthly')

    // Create new task instance
    const newTaskData: Partial<Task> = {
      project_id: completedTask.project_id,
      title: completedTask.title,
      description: completedTask.description,
      priority: completedTask.priority,
      recurring_type: completedTask.recurring_type,
      status: 'open',
      due_date: nextDueDate,
      completed_at: null,
      completion_note: null,
    }

    const { data: newTask, error: createError } = await supabase
      .from('tasks')
      .insert(newTaskData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating recurring task:', createError)
      return NextResponse.json(
        { error: 'Failed to create recurring task' },
        { status: 500 }
      )
    }

    console.log(`Created recurring task ${newTask.id} from ${body.completed_task_id}, next due: ${nextDueDate}`)

    return NextResponse.json({ task: newTask }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/tasks/recurring:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
