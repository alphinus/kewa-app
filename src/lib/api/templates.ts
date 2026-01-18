/**
 * Template System Client API
 *
 * Client-side functions for interacting with the template CRUD endpoints.
 * Used by UI components for template management.
 */

import type {
  Template,
  TemplateWithHierarchy,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplatePhase,
  CreateTemplatePhaseInput,
  TemplatePackage,
  CreateTemplatePackageInput,
  TemplateTask,
  CreateTemplateTaskInput,
  TemplateCategory,
  TemplateScope
} from '@/types/templates'

const API_BASE = '/api/templates'

// =============================================
// TEMPLATE OPERATIONS
// =============================================

/**
 * Fetch all templates with optional filters
 */
export async function fetchTemplates(options?: {
  category?: TemplateCategory
  scope?: TemplateScope
  active?: boolean
}): Promise<Template[]> {
  const params = new URLSearchParams()
  if (options?.category) params.set('category', options.category)
  if (options?.scope) params.set('scope', options.scope)
  if (options?.active !== undefined) params.set('active', String(options.active))

  const url = params.toString() ? `${API_BASE}?${params}` : API_BASE
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch templates')
  }
  const data = await res.json()
  return data.templates
}

/**
 * Fetch a single template with full hierarchy
 */
export async function fetchTemplate(id: string): Promise<TemplateWithHierarchy> {
  const res = await fetch(`${API_BASE}/${id}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch template')
  }
  const data = await res.json()
  return data.template
}

/**
 * Create a new template
 */
export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create template')
  }
  const data = await res.json()
  return data.template
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  id: string,
  input: UpdateTemplateInput
): Promise<Template> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update template')
  }
  const data = await res.json()
  return data.template
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete template')
  }
}

/**
 * Duplicate a template (creates a copy with all phases, packages, tasks)
 */
export async function duplicateTemplate(id: string): Promise<Template> {
  const res = await fetch(`${API_BASE}/${id}/duplicate`, { method: 'POST' })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to duplicate template')
  }
  const data = await res.json()
  return data.template
}

// =============================================
// PHASE OPERATIONS
// =============================================

/**
 * Fetch all phases for a template
 */
export async function fetchPhases(templateId: string): Promise<TemplatePhase[]> {
  const res = await fetch(`${API_BASE}/${templateId}/phases`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch phases')
  }
  const data = await res.json()
  return data.phases
}

/**
 * Create a new phase in a template
 */
export async function createPhase(
  templateId: string,
  input: Omit<CreateTemplatePhaseInput, 'template_id'>
): Promise<TemplatePhase> {
  const res = await fetch(`${API_BASE}/${templateId}/phases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create phase')
  }
  const data = await res.json()
  return data.phase
}

/**
 * Update an existing phase
 */
export async function updatePhase(
  templateId: string,
  phaseId: string,
  input: Partial<TemplatePhase>
): Promise<TemplatePhase> {
  const res = await fetch(`${API_BASE}/${templateId}/phases/${phaseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update phase')
  }
  const data = await res.json()
  return data.phase
}

/**
 * Delete a phase
 */
export async function deletePhase(templateId: string, phaseId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${templateId}/phases/${phaseId}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete phase')
  }
}

// =============================================
// PACKAGE OPERATIONS
// =============================================

/**
 * Fetch all packages for a template
 */
export async function fetchPackages(
  templateId: string,
  phaseId?: string
): Promise<TemplatePackage[]> {
  const params = phaseId ? `?phase_id=${phaseId}` : ''
  const res = await fetch(`${API_BASE}/${templateId}/packages${params}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch packages')
  }
  const data = await res.json()
  return data.packages
}

/**
 * Create a new package in a template
 */
export async function createPackage(
  templateId: string,
  input: Omit<CreateTemplatePackageInput, 'template_id'>
): Promise<TemplatePackage> {
  const res = await fetch(`${API_BASE}/${templateId}/packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create package')
  }
  const data = await res.json()
  return data.package
}

/**
 * Update an existing package
 */
export async function updatePackage(
  templateId: string,
  packageId: string,
  input: Partial<TemplatePackage>
): Promise<TemplatePackage> {
  const res = await fetch(`${API_BASE}/${templateId}/packages/${packageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update package')
  }
  const data = await res.json()
  return data.package
}

/**
 * Delete a package
 */
export async function deletePackage(templateId: string, packageId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${templateId}/packages/${packageId}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete package')
  }
}

// =============================================
// TASK OPERATIONS
// =============================================

/**
 * Fetch all tasks for a template
 */
export async function fetchTasks(
  templateId: string,
  packageId?: string
): Promise<TemplateTask[]> {
  const params = packageId ? `?package_id=${packageId}` : ''
  const res = await fetch(`${API_BASE}/${templateId}/tasks${params}`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch tasks')
  }
  const data = await res.json()
  return data.tasks
}

/**
 * Create a new task in a template
 */
export async function createTask(
  templateId: string,
  input: Omit<CreateTemplateTaskInput, 'template_id'>
): Promise<TemplateTask> {
  const res = await fetch(`${API_BASE}/${templateId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create task')
  }
  const data = await res.json()
  return data.task
}

/**
 * Update an existing task
 */
export async function updateTask(
  templateId: string,
  taskId: string,
  input: Partial<TemplateTask>
): Promise<TemplateTask> {
  const res = await fetch(`${API_BASE}/${templateId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update task')
  }
  const data = await res.json()
  return data.task
}

/**
 * Delete a task
 */
export async function deleteTask(templateId: string, taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${templateId}/tasks/${taskId}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete task')
  }
}
