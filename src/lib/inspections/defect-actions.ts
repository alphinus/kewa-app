/**
 * Defect Action Handlers
 *
 * Handles post-review defect actions: create task, defer, dismiss.
 * Phase: 22-inspection-core Plan 03
 */

import { createPublicClient } from '@/lib/supabase/with-org'
import type { InspectionDefect, Inspection, DefectSeverity } from '@/types/inspections'

/**
 * Map defect severity to task priority
 */
function severityToPriority(severity: DefectSeverity): 'urgent' | 'high' | 'normal' | 'low' {
  switch (severity) {
    case 'schwer':
      return 'urgent'
    case 'mittel':
      return 'high'
    case 'gering':
      return 'normal'
    default:
      return 'normal'
  }
}

/**
 * Create follow-up task from defect
 *
 * Creates a task linked to the inspection's work order (or project if no work order).
 * If work order has a task_id, creates as subtask; otherwise standalone task.
 *
 * @param defect Defect to create task for
 * @param inspection Inspection context
 * @param assigneeId User ID to assign task to
 * @returns Created task
 */
export async function createFollowUpTask(
  defect: InspectionDefect,
  inspection: Inspection,
  assigneeId: string
) {
  const supabase = await createPublicClient()

  // Build task data
  const taskTitle = `Mangel: ${defect.title}`
  const taskDescription = `${defect.description || ''}\n\n(Schweregrad: ${defect.severity})\n\nAbnahme: ${inspection.title}`
  const priority = severityToPriority(defect.severity)

  // Determine project context and parent task
  let projectId = inspection.project_id
  let parentTaskId: string | null = null

  // If inspection has work order, look up its task_id and project
  if (inspection.work_order_id) {
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select('task_id, renovation_project_id')
      .eq('id', inspection.work_order_id)
      .single()

    if (woError) {
      throw new Error(`Failed to fetch work order: ${woError.message}`)
    }

    if (workOrder) {
      parentTaskId = workOrder.task_id
      projectId = workOrder.renovation_project_id || projectId
    }
  }

  if (!projectId) {
    throw new Error('Cannot create task: no project context found')
  }

  // Create task
  // Note: tasks table uses project_id not renovation_project_id
  const insertData = {
    title: taskTitle,
    description: taskDescription,
    project_id: projectId,
    parent_task_id: parentTaskId,
    status: 'open',
    priority: priority,
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert(insertData)
    .select()
    .single()

  if (taskError) {
    throw new Error(`Failed to create task: ${taskError.message}`)
  }

  // Update defect to link to task
  const { error: defectError } = await supabase
    .from('inspection_defects')
    .update({
      action: 'task_created',
      linked_task_id: task.id,
    })
    .eq('id', defect.id)

  if (defectError) {
    throw new Error(`Failed to update defect: ${defectError.message}`)
  }

  return task
}

/**
 * Defer defect to next inspection
 *
 * @param defectId Defect ID
 * @param reason Optional reason for deferral
 */
export async function deferDefect(
  defectId: string,
  reason?: string
): Promise<void> {
  const supabase = await createPublicClient()

  const { error } = await supabase
    .from('inspection_defects')
    .update({
      action: 'deferred',
      action_reason: reason || null,
    })
    .eq('id', defectId)

  if (error) {
    throw new Error(`Failed to defer defect: ${error.message}`)
  }
}

/**
 * Dismiss defect (not actionable)
 *
 * @param defectId Defect ID
 * @param reason Reason for dismissal (required)
 */
export async function dismissDefect(
  defectId: string,
  reason: string
): Promise<void> {
  const supabase = await createPublicClient()

  if (!reason || reason.trim() === '') {
    throw new Error('Reason is required when dismissing a defect')
  }

  const { error } = await supabase
    .from('inspection_defects')
    .update({
      action: 'dismissed',
      action_reason: reason,
    })
    .eq('id', defectId)

  if (error) {
    throw new Error(`Failed to dismiss defect: ${error.message}`)
  }
}
