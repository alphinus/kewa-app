/**
 * Dependency utilities for template system
 * Uses Kahn's algorithm for circular dependency detection
 */

interface Dependency {
  predecessor_task_id: string
  successor_task_id: string
}

/**
 * Detects circular dependencies using topological sort (Kahn's algorithm)
 */
export function detectCircularDependency(dependencies: Dependency[]): {
  hasCircle: boolean
  cycle?: string[]
} {
  // Build adjacency list and in-degree count
  const graph = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  // Initialize all nodes
  for (const dep of dependencies) {
    if (!graph.has(dep.predecessor_task_id)) {
      graph.set(dep.predecessor_task_id, [])
      inDegree.set(dep.predecessor_task_id, 0)
    }
    if (!graph.has(dep.successor_task_id)) {
      graph.set(dep.successor_task_id, [])
      inDegree.set(dep.successor_task_id, 0)
    }

    // Add edge
    graph.get(dep.predecessor_task_id)!.push(dep.successor_task_id)
    inDegree.set(
      dep.successor_task_id,
      (inDegree.get(dep.successor_task_id) || 0) + 1
    )
  }

  // Find all nodes with in-degree 0
  const queue: string[] = []
  for (const [node, degree] of inDegree) {
    if (degree === 0) {
      queue.push(node)
    }
  }

  // Process nodes
  let processedCount = 0
  while (queue.length > 0) {
    const node = queue.shift()!
    processedCount++

    for (const neighbor of graph.get(node) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  // If we processed all nodes, no cycle
  if (processedCount === graph.size) {
    return { hasCircle: false }
  }

  // Find the cycle (nodes with remaining in-degree > 0)
  const cycleNodes: string[] = []
  for (const [node, degree] of inDegree) {
    if (degree > 0) {
      cycleNodes.push(node)
    }
  }

  // Try to trace the actual cycle for better error message
  const cycle = traceCycle(graph, cycleNodes[0])

  return {
    hasCircle: true,
    cycle: cycle || cycleNodes
  }
}

/**
 * Traces a cycle starting from a given node
 */
function traceCycle(graph: Map<string, string[]>, startNode: string): string[] | null {
  const visited = new Set<string>()
  const path: string[] = []

  function dfs(node: string): string[] | null {
    if (path.includes(node)) {
      // Found cycle - return from cycle start
      const cycleStart = path.indexOf(node)
      return [...path.slice(cycleStart), node]
    }

    if (visited.has(node)) {
      return null
    }

    visited.add(node)
    path.push(node)

    for (const neighbor of graph.get(node) || []) {
      const result = dfs(neighbor)
      if (result) return result
    }

    path.pop()
    return null
  }

  return dfs(startNode)
}

/**
 * Validates a new dependency won't create a cycle
 */
export async function validateDependency(
  existingDeps: Dependency[],
  newPredecessor: string,
  newSuccessor: string
): Promise<{ valid: boolean; error?: string; cycle?: string[] }> {
  // Self-reference check
  if (newPredecessor === newSuccessor) {
    return {
      valid: false,
      error: 'Task cannot depend on itself'
    }
  }

  // Check for circular dependency
  const allDeps = [
    ...existingDeps,
    { predecessor_task_id: newPredecessor, successor_task_id: newSuccessor }
  ]

  const result = detectCircularDependency(allDeps)

  if (result.hasCircle) {
    return {
      valid: false,
      error: 'Would create circular dependency',
      cycle: result.cycle
    }
  }

  return { valid: true }
}

/**
 * Get all tasks that depend on a given task (direct and indirect)
 */
export function getDependentTasks(
  dependencies: Dependency[],
  taskId: string
): string[] {
  const dependents = new Set<string>()
  const queue = [taskId]

  while (queue.length > 0) {
    const current = queue.shift()!

    for (const dep of dependencies) {
      if (dep.predecessor_task_id === current && !dependents.has(dep.successor_task_id)) {
        dependents.add(dep.successor_task_id)
        queue.push(dep.successor_task_id)
      }
    }
  }

  return Array.from(dependents)
}

/**
 * Get all tasks that a given task depends on (direct and indirect)
 */
export function getPrerequisiteTasks(
  dependencies: Dependency[],
  taskId: string
): string[] {
  const prerequisites = new Set<string>()
  const queue = [taskId]

  while (queue.length > 0) {
    const current = queue.shift()!

    for (const dep of dependencies) {
      if (dep.successor_task_id === current && !prerequisites.has(dep.predecessor_task_id)) {
        prerequisites.add(dep.predecessor_task_id)
        queue.push(dep.predecessor_task_id)
      }
    }
  }

  return Array.from(prerequisites)
}

/**
 * Get direct predecessors for a task
 */
export function getDirectPredecessors(
  dependencies: Dependency[],
  taskId: string
): string[] {
  return dependencies
    .filter(dep => dep.successor_task_id === taskId)
    .map(dep => dep.predecessor_task_id)
}

/**
 * Get direct successors for a task
 */
export function getDirectSuccessors(
  dependencies: Dependency[],
  taskId: string
): string[] {
  return dependencies
    .filter(dep => dep.predecessor_task_id === taskId)
    .map(dep => dep.successor_task_id)
}
