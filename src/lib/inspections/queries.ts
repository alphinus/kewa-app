/**
 * Inspection Database Queries
 *
 * Database query functions for inspections, templates, and defects
 * Phase: 22-inspection-core
 */

import { createClient } from '@/lib/supabase/server'
import type {
  InspectionTemplate,
  Inspection,
  InspectionDefect,
  CreateInspectionTemplateInput,
  UpdateInspectionTemplateInput,
  CreateInspectionInput,
  UpdateInspectionInput,
  CreateDefectInput,
  UpdateDefectInput,
  ChecklistSectionResult,
} from '@/types/inspections'
import { validateInspectionTransition, validateDefectTransition } from './workflow'

// =============================================
// INSPECTION TEMPLATES
// =============================================

/**
 * List inspection templates with optional filters
 */
export async function listInspectionTemplates(filters?: {
  trade_category?: string
  is_active?: boolean
}) {
  const supabase = await createClient()

  let query = supabase
    .from('inspection_templates')
    .select('*')
    .order('name', { ascending: true })

  if (filters?.trade_category) {
    query = query.eq('trade_category', filters.trade_category)
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list inspection templates: ${error.message}`)
  }

  return data as InspectionTemplate[]
}

/**
 * Get single inspection template by ID
 */
export async function getInspectionTemplate(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspection_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to get inspection template: ${error.message}`)
  }

  return data as InspectionTemplate
}

/**
 * Create a new inspection template
 */
export async function createInspectionTemplate(
  input: CreateInspectionTemplateInput,
  userId: string
) {
  const supabase = await createClient()

  const insertData = {
    name: input.name,
    description: input.description || null,
    trade_category: input.trade_category,
    formality_level: input.formality_level || 'informal_check',
    checklist_sections: input.checklist_sections,
    created_by: userId,
  }

  const { data, error } = await supabase
    .from('inspection_templates')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create inspection template: ${error.message}`)
  }

  return data as InspectionTemplate
}

/**
 * Update an inspection template
 */
export async function updateInspectionTemplate(
  id: string,
  input: UpdateInspectionTemplateInput
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.trade_category !== undefined) updateData.trade_category = input.trade_category
  if (input.formality_level !== undefined) updateData.formality_level = input.formality_level
  if (input.checklist_sections !== undefined) updateData.checklist_sections = input.checklist_sections
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await supabase
    .from('inspection_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update inspection template: ${error.message}`)
  }

  return data as InspectionTemplate
}

/**
 * Delete (soft-delete) an inspection template
 */
export async function deleteInspectionTemplate(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inspection_templates')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete inspection template: ${error.message}`)
  }
}

// =============================================
// INSPECTIONS
// =============================================

/**
 * Inspection select query with joins
 * Includes Phase 23 acknowledgment fields for portal tracking
 */
const INSPECTION_SELECT = `
  *,
  acknowledged_at,
  acknowledged_by_email,
  work_order:work_orders(id, title, wo_number),
  project:renovation_projects(id, name),
  template:inspection_templates(id, name, checklist_sections)
`

/**
 * List inspections with optional filters
 */
export async function listInspections(filters?: {
  work_order_id?: string
  project_id?: string
  status?: string
  inspector_id?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('inspections')
    .select(INSPECTION_SELECT)
    .order('created_at', { ascending: false })

  if (filters?.work_order_id) {
    query = query.eq('work_order_id', filters.work_order_id)
  }

  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.inspector_id) {
    query = query.eq('inspector_id', filters.inspector_id)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list inspections: ${error.message}`)
  }

  return data as Inspection[]
}

/**
 * Get single inspection by ID with defects
 */
export async function getInspection(id: string) {
  const supabase = await createClient()

  // Fetch inspection with joins
  const { data: inspection, error: inspectionError } = await supabase
    .from('inspections')
    .select(INSPECTION_SELECT)
    .eq('id', id)
    .single()

  if (inspectionError) {
    throw new Error(`Failed to get inspection: ${inspectionError.message}`)
  }

  // Fetch defects
  const { data: defects, error: defectsError } = await supabase
    .from('inspection_defects')
    .select('*')
    .eq('inspection_id', id)
    .order('severity', { ascending: false })
    .order('created_at', { ascending: true })

  if (defectsError) {
    throw new Error(`Failed to get defects: ${defectsError.message}`)
  }

  return {
    ...inspection,
    defects: defects as InspectionDefect[],
  } as Inspection
}

/**
 * Create a new inspection
 *
 * If template_id provided, populates checklist_items from template.
 */
export async function createInspection(
  input: CreateInspectionInput,
  userId: string
) {
  const supabase = await createClient()

  // If template_id provided, fetch template to populate checklist
  let checklistItems: ChecklistSectionResult[] = input.checklist_items || []

  if (input.template_id && !input.checklist_items) {
    const template = await getInspectionTemplate(input.template_id)

    // Convert template sections to checklist items with null status
    checklistItems = template.checklist_sections.map((section) => ({
      section_id: section.id,
      name: section.name,
      items: section.items.map((item) => ({
        item_id: item.id,
        status: 'na' as const,
        notes: null,
        checked_at: new Date().toISOString(),
        photo_storage_paths: [],
      })),
    }))
  }

  const insertData = {
    work_order_id: input.work_order_id || null,
    project_id: input.project_id || null,
    template_id: input.template_id || null,
    title: input.title,
    description: input.description || null,
    inspection_date: input.inspection_date || new Date().toISOString().split('T')[0],
    inspector_id: userId,
    checklist_items: checklistItems,
  }

  const { data, error } = await supabase
    .from('inspections')
    .insert(insertData)
    .select(INSPECTION_SELECT)
    .single()

  if (error) {
    throw new Error(`Failed to create inspection: ${error.message}`)
  }

  return data as Inspection
}

/**
 * Update an inspection
 *
 * Validates status transitions before updating.
 */
export async function updateInspection(
  id: string,
  input: UpdateInspectionInput
) {
  const supabase = await createClient()

  // If status change requested, validate transition
  if (input.status) {
    const { data: current } = await supabase
      .from('inspections')
      .select('status')
      .eq('id', id)
      .single()

    if (current) {
      const validation = validateInspectionTransition(
        current.status,
        input.status
      )

      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }
  }

  const updateData: Record<string, unknown> = {}

  if (input.checklist_items !== undefined) updateData.checklist_items = input.checklist_items
  if (input.overall_result !== undefined) updateData.overall_result = input.overall_result
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.status !== undefined) updateData.status = input.status
  if (input.signature_storage_path !== undefined) updateData.signature_storage_path = input.signature_storage_path
  if (input.signer_name !== undefined) updateData.signer_name = input.signer_name
  if (input.signer_role !== undefined) updateData.signer_role = input.signer_role
  if (input.signature_refused !== undefined) updateData.signature_refused = input.signature_refused
  if (input.signature_refused_reason !== undefined) updateData.signature_refused_reason = input.signature_refused_reason

  const { data, error } = await supabase
    .from('inspections')
    .update(updateData)
    .eq('id', id)
    .select(INSPECTION_SELECT)
    .single()

  if (error) {
    throw new Error(`Failed to update inspection: ${error.message}`)
  }

  return data as Inspection
}

/**
 * Delete an inspection
 *
 * Only allowed if status is 'in_progress'.
 */
export async function deleteInspection(id: string) {
  const supabase = await createClient()

  // Check current status
  const { data: current } = await supabase
    .from('inspections')
    .select('status')
    .eq('id', id)
    .single()

  if (current && current.status !== 'in_progress') {
    throw new Error('Cannot delete inspection that is completed or signed')
  }

  const { error } = await supabase
    .from('inspections')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete inspection: ${error.message}`)
  }
}

// =============================================
// DEFECTS
// =============================================

/**
 * List defects for an inspection
 */
export async function listDefects(inspectionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inspection_defects')
    .select('*')
    .eq('inspection_id', inspectionId)
    .order('severity', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to list defects: ${error.message}`)
  }

  return data as InspectionDefect[]
}

/**
 * Create a new defect
 */
export async function createDefect(
  input: CreateDefectInput,
  userId: string
) {
  const supabase = await createClient()

  const insertData = {
    inspection_id: input.inspection_id,
    checklist_item_id: input.checklist_item_id || null,
    title: input.title,
    description: input.description || null,
    severity: input.severity,
    created_by: userId,
  }

  const { data, error } = await supabase
    .from('inspection_defects')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create defect: ${error.message}`)
  }

  return data as InspectionDefect
}

/**
 * Update a defect
 *
 * Validates status transitions before updating.
 */
export async function updateDefect(
  id: string,
  input: UpdateDefectInput
) {
  const supabase = await createClient()

  // If status change requested, validate transition
  if (input.status) {
    const { data: current } = await supabase
      .from('inspection_defects')
      .select('status')
      .eq('id', id)
      .single()

    if (current) {
      const validation = validateDefectTransition(
        current.status,
        input.status
      )

      if (!validation.valid) {
        throw new Error(validation.error)
      }
    }
  }

  const updateData: Record<string, unknown> = {}

  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.severity !== undefined) updateData.severity = input.severity
  if (input.status !== undefined) updateData.status = input.status
  if (input.action !== undefined) updateData.action = input.action
  if (input.action_reason !== undefined) updateData.action_reason = input.action_reason
  if (input.linked_task_id !== undefined) updateData.linked_task_id = input.linked_task_id

  const { data, error } = await supabase
    .from('inspection_defects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update defect: ${error.message}`)
  }

  return data as InspectionDefect
}

/**
 * Delete a defect
 */
export async function deleteDefect(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inspection_defects')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete defect: ${error.message}`)
  }
}
