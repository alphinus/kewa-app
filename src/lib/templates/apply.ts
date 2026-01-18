/**
 * Template Application Client Library
 *
 * Client-side functions for applying templates to renovation projects.
 */

import type { TemplateWithHierarchy, TemplateTask } from '@/types/templates'

interface ApplyTemplateResult {
  success: boolean
  template_id: string
  template_name: string
  project_id: string
  phases_created: number
  packages_created: number
  tasks_created: number
  dependencies_created: number
  gates_created: number
}

/**
 * Apply a template to a project
 */
export async function applyTemplateToProject(options: {
  templateId: string
  projectId: string
  startDate?: Date
  excludedTaskIds?: string[]
}): Promise<ApplyTemplateResult> {
  const response = await fetch(`/api/templates/${options.templateId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: options.projectId,
      start_date: options.startDate?.toISOString().split('T')[0],
      excluded_task_ids: options.excludedTaskIds || []
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to apply template')
  }

  const data = await response.json()
  return {
    success: data.success,
    ...data.applied
  }
}

/**
 * Stack multiple templates onto a project
 */
export async function stackTemplates(
  projectId: string,
  templates: Array<{
    templateId: string
    excludedTaskIds?: string[]
  }>,
  startDate: Date
): Promise<Array<{
  templateId: string
  tasks_created: number
  dependencies_created: number
}>> {
  const results = []

  for (const template of templates) {
    const result = await applyTemplateToProject({
      templateId: template.templateId,
      projectId,
      startDate,
      excludedTaskIds: template.excludedTaskIds
    })

    results.push({
      templateId: template.templateId,
      tasks_created: result.tasks_created,
      dependencies_created: result.dependencies_created
    })
  }

  return results
}

/**
 * Get all optional tasks from a template for preview
 */
export function getOptionalTasks(template: TemplateWithHierarchy): TemplateTask[] {
  const optional: TemplateTask[] = []

  for (const phase of template.phases) {
    for (const pkg of phase.packages) {
      for (const task of pkg.tasks) {
        if (task.is_optional) {
          optional.push(task)
        }
      }
    }
  }

  return optional
}

/**
 * Get all tasks from a template (flat list)
 */
export function getAllTasks(template: TemplateWithHierarchy): TemplateTask[] {
  const tasks: TemplateTask[] = []

  for (const phase of template.phases) {
    for (const pkg of phase.packages) {
      for (const task of pkg.tasks) {
        tasks.push(task)
      }
    }
  }

  return tasks
}

/**
 * Calculate total duration and cost for selected tasks
 */
export function calculateTemplateMetrics(
  template: TemplateWithHierarchy,
  excludedTaskIds: Set<string>
): {
  totalDays: number
  totalCost: number
  taskCount: number
} {
  let totalDays = 0
  let totalCost = 0
  let taskCount = 0

  for (const phase of template.phases) {
    for (const pkg of phase.packages) {
      for (const task of pkg.tasks) {
        if (!excludedTaskIds.has(task.id)) {
          totalDays += task.estimated_duration_days
          totalCost += task.estimated_cost || 0
          taskCount++
        }
      }
    }
  }

  return { totalDays, totalCost, taskCount }
}

/**
 * Get tasks that would be affected by excluding an optional task
 * (tasks that depend on it)
 */
export function getAffectedByExclusion(
  template: TemplateWithHierarchy,
  taskId: string
): string[] {
  const affected: string[] = []

  for (const dep of template.dependencies) {
    if (dep.predecessor_task_id === taskId) {
      affected.push(dep.successor_task_id)
    }
  }

  return affected
}

/**
 * Get task name by ID from template
 */
export function getTaskById(
  template: TemplateWithHierarchy,
  taskId: string
): TemplateTask | undefined {
  for (const phase of template.phases) {
    for (const pkg of phase.packages) {
      for (const task of pkg.tasks) {
        if (task.id === taskId) {
          return task
        }
      }
    }
  }
  return undefined
}

/**
 * Format currency for Swiss francs
 */
export function formatCHF(amount: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF'
  }).format(amount)
}

/**
 * Format duration in days
 */
export function formatDuration(days: number): string {
  if (days === 1) return '1 Tag'
  return `${days} Tage`
}
