import { addDays, differenceInDays } from 'date-fns'
import type { TemplateWithHierarchy, TemplateDependency } from '@/types/templates'

/**
 * Scheduled task with calculated dates
 */
export interface ScheduledTask {
  id: string
  name: string
  wbs_code: string
  start: Date
  end: Date
  duration: number
  packageId: string
  phaseId: string
  isCritical: boolean
}

/**
 * Scheduled package with calculated dates
 */
export interface ScheduledPackage {
  id: string
  name: string
  wbs_code: string
  start: Date
  end: Date
  duration: number
  phaseId: string
  tasks: ScheduledTask[]
}

/**
 * Scheduled phase with calculated dates
 */
export interface ScheduledPhase {
  id: string
  name: string
  wbs_code: string
  start: Date
  end: Date
  duration: number
  packages: ScheduledPackage[]
}

/**
 * Complete schedule calculation result
 */
export interface ScheduleResult {
  phases: ScheduledPhase[]
  tasks: ScheduledTask[]
  totalDays: number
  criticalPath: string[]
  startDate: Date
  endDate: Date
}

/**
 * Calculate schedule from template with dependencies
 * Uses Forward Pass algorithm for early start/finish
 */
export function calculateSchedule(
  template: TemplateWithHierarchy,
  startDate: Date = new Date()
): ScheduleResult {
  const taskMap = new Map<string, ScheduledTask>()
  const dependencyMap = new Map<string, TemplateDependency[]>()

  // Build dependency lookup (successor -> predecessors)
  for (const dep of template.dependencies) {
    if (!dependencyMap.has(dep.successor_task_id)) {
      dependencyMap.set(dep.successor_task_id, [])
    }
    dependencyMap.get(dep.successor_task_id)!.push(dep)
  }

  // Collect all tasks with package/phase info
  const allTaskIds: string[] = []
  for (const phase of template.phases) {
    for (const pkg of phase.packages || []) {
      for (const task of pkg.tasks || []) {
        allTaskIds.push(task.id)
        taskMap.set(task.id, {
          id: task.id,
          name: task.name,
          wbs_code: task.wbs_code,
          start: new Date(startDate),
          end: addDays(startDate, task.estimated_duration_days),
          duration: task.estimated_duration_days,
          packageId: pkg.id,
          phaseId: phase.id,
          isCritical: false
        })
      }
    }
  }

  // Topological sort for processing order
  const sorted = topologicalSort(allTaskIds, dependencyMap)

  // Forward pass - calculate early start/finish
  for (const taskId of sorted) {
    const task = taskMap.get(taskId)
    if (!task) continue

    const deps = dependencyMap.get(taskId) || []
    let earliestStart = new Date(startDate)

    for (const dep of deps) {
      const predecessor = taskMap.get(dep.predecessor_task_id)
      if (!predecessor) continue

      let depDate: Date
      switch (dep.dependency_type) {
        case 'FS': // Finish-to-Start (most common)
          depDate = addDays(predecessor.end, dep.lag_days)
          break
        case 'SS': // Start-to-Start
          depDate = addDays(predecessor.start, dep.lag_days)
          break
        case 'FF': // Finish-to-Finish
          depDate = addDays(predecessor.end, dep.lag_days - task.duration)
          break
        case 'SF': // Start-to-Finish (rare)
          depDate = addDays(predecessor.start, dep.lag_days - task.duration)
          break
        default:
          depDate = addDays(predecessor.end, dep.lag_days)
      }

      if (depDate > earliestStart) {
        earliestStart = depDate
      }
    }

    task.start = earliestStart
    task.end = addDays(earliestStart, task.duration)
  }

  // Find project end date
  let projectEndDate = new Date(startDate)
  for (const task of taskMap.values()) {
    if (task.end > projectEndDate) {
      projectEndDate = task.end
    }
  }

  // Find critical path (tasks that end at project end with no slack)
  const criticalPath = findCriticalPath(taskMap, projectEndDate)

  // Mark critical tasks
  for (const taskId of criticalPath) {
    const task = taskMap.get(taskId)
    if (task) task.isCritical = true
  }

  // Build scheduled phases
  const scheduledPhases: ScheduledPhase[] = []

  for (const phase of template.phases) {
    let phaseStart = projectEndDate
    let phaseEnd = new Date(startDate)

    const scheduledPackages: ScheduledPackage[] = []

    for (const pkg of phase.packages || []) {
      let pkgStart = projectEndDate
      let pkgEnd = new Date(startDate)

      const scheduledTasks: ScheduledTask[] = []

      for (const task of pkg.tasks || []) {
        const scheduled = taskMap.get(task.id)
        if (scheduled) {
          scheduledTasks.push(scheduled)
          if (scheduled.start < pkgStart) pkgStart = scheduled.start
          if (scheduled.end > pkgEnd) pkgEnd = scheduled.end
        }
      }

      // Handle empty packages
      if (scheduledTasks.length === 0) {
        pkgStart = new Date(startDate)
        pkgEnd = new Date(startDate)
      }

      scheduledPackages.push({
        id: pkg.id,
        name: pkg.name,
        wbs_code: pkg.wbs_code,
        start: pkgStart,
        end: pkgEnd,
        duration: differenceInDays(pkgEnd, pkgStart),
        phaseId: phase.id,
        tasks: scheduledTasks
      })

      if (pkgStart < phaseStart) phaseStart = pkgStart
      if (pkgEnd > phaseEnd) phaseEnd = pkgEnd
    }

    // Handle empty phases
    if (scheduledPackages.length === 0) {
      phaseStart = new Date(startDate)
      phaseEnd = new Date(startDate)
    }

    scheduledPhases.push({
      id: phase.id,
      name: phase.name,
      wbs_code: phase.wbs_code,
      start: phaseStart,
      end: phaseEnd,
      duration: differenceInDays(phaseEnd, phaseStart),
      packages: scheduledPackages
    })
  }

  const totalDays = differenceInDays(projectEndDate, startDate)

  return {
    phases: scheduledPhases,
    tasks: Array.from(taskMap.values()),
    totalDays,
    criticalPath,
    startDate,
    endDate: projectEndDate
  }
}

/**
 * Topological sort of tasks based on dependencies
 */
function topologicalSort(
  taskIds: string[],
  dependencyMap: Map<string, TemplateDependency[]>
): string[] {
  const result: string[] = []
  const visited = new Set<string>()
  const temp = new Set<string>()

  function visit(id: string): void {
    if (temp.has(id)) {
      console.warn('Circular dependency detected involving task:', id)
      return // Skip to avoid infinite loop
    }
    if (visited.has(id)) return

    temp.add(id)

    // Visit all predecessors first
    const deps = dependencyMap.get(id) || []
    for (const dep of deps) {
      if (taskIds.includes(dep.predecessor_task_id)) {
        visit(dep.predecessor_task_id)
      }
    }

    temp.delete(id)
    visited.add(id)
    result.push(id)
  }

  for (const id of taskIds) {
    if (!visited.has(id)) {
      visit(id)
    }
  }

  return result
}

/**
 * Find critical path tasks
 * Tasks are critical if they end at project end (no slack)
 */
function findCriticalPath(
  taskMap: Map<string, ScheduledTask>,
  projectEnd: Date
): string[] {
  const criticalTasks: string[] = []

  for (const [id, task] of taskMap) {
    // Task is critical if it ends at or very close to project end
    const daysFromEnd = differenceInDays(projectEnd, task.end)
    if (daysFromEnd <= 0) {
      criticalTasks.push(id)
    }
  }

  return criticalTasks
}

/**
 * Format duration as human readable (German)
 */
export function formatDuration(days: number): string {
  if (days === 0) return '0 Tage'
  if (days === 1) return '1 Tag'
  if (days < 7) return `${days} Tage`

  const weeks = Math.floor(days / 7)
  const remainingDays = days % 7

  if (remainingDays === 0) {
    return weeks === 1 ? '1 Woche' : `${weeks} Wochen`
  }

  const weekPart = weeks === 1 ? '1 Wo.' : `${weeks} Wo.`
  const dayPart = remainingDays === 1 ? '1 Tag' : `${remainingDays} Tage`

  return `${weekPart} ${dayPart}`
}

/**
 * Calculate total estimated cost from template
 */
export function calculateTotalCost(template: TemplateWithHierarchy): number {
  let total = 0

  for (const phase of template.phases) {
    for (const pkg of phase.packages || []) {
      if (pkg.estimated_cost) {
        total += pkg.estimated_cost
      }
      for (const task of pkg.tasks || []) {
        if (task.estimated_cost) {
          total += task.estimated_cost
        }
      }
    }
  }

  return total
}

/**
 * Calculate total duration from template (respecting dependencies)
 */
export function calculateTotalDuration(template: TemplateWithHierarchy): number {
  const schedule = calculateSchedule(template, new Date())
  return schedule.totalDays
}

/**
 * Get task dependencies in a human-readable format
 */
export function getTaskDependencies(
  taskId: string,
  dependencies: TemplateDependency[],
  taskMap: Map<string, { name: string; wbs_code: string }>
): Array<{ predecessor: string; type: string; lag: number }> {
  return dependencies
    .filter(d => d.successor_task_id === taskId)
    .map(d => {
      const predecessor = taskMap.get(d.predecessor_task_id)
      return {
        predecessor: predecessor ? `${predecessor.wbs_code} ${predecessor.name}` : d.predecessor_task_id,
        type: d.dependency_type,
        lag: d.lag_days
      }
    })
}
