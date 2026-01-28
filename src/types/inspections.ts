/**
 * Inspection Types
 *
 * Types for inspection management with templates, checklists, defects, and signatures.
 * Phase: 22-inspection-core
 */

// =============================================
// STATUS ENUMS
// =============================================

/**
 * Inspection formality level
 */
export type InspectionFormality =
  | 'informal_check'
  | 'formal_abnahme'

/**
 * Inspection status workflow
 * Valid transitions:
 * - in_progress -> completed
 * - completed -> signed
 * - signed -> terminal state
 */
export type InspectionStatus =
  | 'in_progress'
  | 'completed'
  | 'signed'

/**
 * Overall inspection result
 */
export type InspectionResult =
  | 'passed'
  | 'passed_with_conditions'
  | 'failed'

/**
 * Defect severity classification
 */
export type DefectSeverity =
  | 'gering'
  | 'mittel'
  | 'schwer'

/**
 * Defect status (independent lifecycle)
 */
export type DefectStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'

/**
 * Post-review action taken for defect
 */
export type DefectAction =
  | 'task_created'
  | 'deferred'
  | 'dismissed'

// =============================================
// CHECKLIST TYPES
// =============================================

/**
 * Single checklist item in template
 */
export interface ChecklistItem {
  id: string
  title: string
  description: string | null
}

/**
 * Section grouping items in template
 */
export interface ChecklistSection {
  id: string
  name: string
  items: ChecklistItem[]
}

/**
 * Checklist item result (pass/fail/na)
 */
export interface ChecklistItemResult {
  item_id: string
  status: 'pass' | 'fail' | 'na'
  notes: string | null
  checked_at: string
  photo_storage_paths: string[]
}

/**
 * Section with executed item results
 */
export interface ChecklistSectionResult {
  section_id: string
  name: string
  items: ChecklistItemResult[]
}

// =============================================
// ENTITY TYPES
// =============================================

/**
 * Inspection template entity
 */
export interface InspectionTemplate {
  id: string
  name: string
  description: string | null
  trade_category: string
  formality_level: InspectionFormality
  checklist_sections: ChecklistSection[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Inspection entity
 */
export interface Inspection {
  id: string
  work_order_id: string | null
  project_id: string | null
  template_id: string | null
  parent_inspection_id: string | null
  title: string
  description: string | null
  inspector_id: string
  inspection_date: string
  status: InspectionStatus
  checklist_items: ChecklistSectionResult[]
  overall_result: InspectionResult | null
  notes: string | null
  signature_storage_path: string | null
  signer_name: string | null
  signer_role: string | null
  signed_at: string | null
  signature_refused: boolean
  signature_refused_reason: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  work_order?: {
    id: string
    title: string
    wo_number: string
  }
  project?: {
    id: string
    name: string
  }
  template?: {
    id: string
    name: string
  }
  defects?: InspectionDefect[]
}

/**
 * Inspection defect entity
 */
export interface InspectionDefect {
  id: string
  inspection_id: string
  checklist_item_id: string | null
  title: string
  description: string | null
  severity: DefectSeverity
  status: DefectStatus
  action: DefectAction | null
  action_reason: string | null
  linked_task_id: string | null
  photo_storage_paths: string[]
  created_by: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

// =============================================
// API INPUT TYPES
// =============================================

/**
 * Input for creating an inspection template
 */
export interface CreateInspectionTemplateInput {
  name: string
  description?: string
  trade_category: string
  formality_level?: InspectionFormality
  checklist_sections: ChecklistSection[]
}

/**
 * Input for updating an inspection template
 */
export interface UpdateInspectionTemplateInput {
  name?: string
  description?: string | null
  trade_category?: string
  formality_level?: InspectionFormality
  checklist_sections?: ChecklistSection[]
  is_active?: boolean
}

/**
 * Input for creating an inspection
 */
export interface CreateInspectionInput {
  work_order_id?: string
  project_id?: string
  template_id?: string
  title: string
  description?: string
  inspection_date?: string
  checklist_items?: ChecklistSectionResult[]
}

/**
 * Input for updating an inspection
 */
export interface UpdateInspectionInput {
  checklist_items?: ChecklistSectionResult[]
  overall_result?: InspectionResult
  notes?: string
  status?: InspectionStatus
  signature_storage_path?: string
  signer_name?: string
  signer_role?: string
  signature_refused?: boolean
  signature_refused_reason?: string
}

/**
 * Input for creating a defect
 */
export interface CreateDefectInput {
  inspection_id: string
  checklist_item_id?: string
  title: string
  description?: string
  severity: DefectSeverity
}

/**
 * Input for updating a defect
 */
export interface UpdateDefectInput {
  title?: string
  description?: string | null
  severity?: DefectSeverity
  status?: DefectStatus
  action?: DefectAction
  action_reason?: string
  linked_task_id?: string
}

// =============================================
// API RESPONSE TYPES
// =============================================

/**
 * Response for GET /api/inspection-templates
 */
export interface InspectionTemplatesResponse {
  templates: InspectionTemplate[]
}

/**
 * Response for GET /api/inspection-templates/[id]
 */
export interface InspectionTemplateResponse {
  template: InspectionTemplate
}

/**
 * Response for GET /api/inspections
 */
export interface InspectionsResponse {
  inspections: Inspection[]
  total: number | null
}

/**
 * Response for GET /api/inspections/[id]
 */
export interface InspectionResponse {
  inspection: Inspection
  defects?: InspectionDefect[]
}

/**
 * Response for GET /api/inspections/[id]/defects or creating defect
 */
export interface DefectsResponse {
  defects: InspectionDefect[]
}
