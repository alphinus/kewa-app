/**
 * Template System types (Phase 08)
 *
 * These interfaces represent the template tables and related
 * structures for the WBS-based renovation template system.
 */

import type {
  TemplateCategory,
  TemplateScope,
  DependencyType,
  GateLevel,
  RoomType,
  TradeCategory
} from './index'

// =============================================
// JSONB STRUCTURE TYPES
// =============================================

/**
 * Material item in template task materials list
 */
export interface TemplateMaterialItem {
  id: string
  name: string
  quantity: number
  unit: string
  estimated_cost?: number
}

/**
 * Checklist item template (used in both tasks and gates)
 */
export interface TemplateChecklistItem {
  id: string
  text: string
  required: boolean
}

// =============================================
// CORE TEMPLATE ENTITIES
// =============================================

/**
 * Root template entity
 */
export interface Template {
  id: string
  name: string
  description: string | null
  category: TemplateCategory
  scope: TemplateScope
  target_room_type: RoomType | null
  total_duration_days: number | null
  total_estimated_cost: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * WBS Level 1: Template phase
 */
export interface TemplatePhase {
  id: string
  template_id: string
  name: string
  description: string | null
  sort_order: number
  wbs_code: string
  estimated_duration_days: number | null
  created_at: string
  updated_at: string
}

/**
 * WBS Level 2: Template package
 */
export interface TemplatePackage {
  id: string
  phase_id: string
  name: string
  description: string | null
  sort_order: number
  wbs_code: string
  trade_category: TradeCategory | null
  estimated_duration_days: number | null
  estimated_cost: number | null
  created_at: string
  updated_at: string
}

/**
 * WBS Level 3: Template task (work item)
 */
export interface TemplateTask {
  id: string
  package_id: string
  name: string
  description: string | null
  sort_order: number
  wbs_code: string
  estimated_duration_days: number
  estimated_cost: number | null
  trade_category: TradeCategory | null
  is_optional: boolean
  materials_list: TemplateMaterialItem[]
  notes: string | null
  checklist_template: TemplateChecklistItem[]
  created_at: string
  updated_at: string
}

/**
 * Task dependency relationship
 */
export interface TemplateDependency {
  id: string
  template_id: string
  predecessor_task_id: string
  successor_task_id: string
  dependency_type: DependencyType
  lag_days: number
  created_at: string
}

/**
 * Quality gate at package or phase boundary
 */
export interface TemplateQualityGate {
  id: string
  template_id: string
  gate_level: GateLevel
  phase_id: string | null
  package_id: string | null
  name: string
  description: string | null
  checklist_items: TemplateChecklistItem[]
  min_photos_required: number
  photo_types: string[]
  is_blocking: boolean
  auto_approve_when_complete: boolean
  created_at: string
  updated_at: string
}

// =============================================
// NESTED/HIERARCHY TYPES
// =============================================

/**
 * Template task with parent package reference
 */
export interface TemplateTaskWithPackage extends TemplateTask {
  package: {
    id: string
    name: string
    wbs_code: string
    phase_id: string
  }
}

/**
 * Template package with nested tasks
 */
export interface TemplatePackageWithTasks extends TemplatePackage {
  tasks: TemplateTask[]
}

/**
 * Template phase with nested packages and tasks
 */
export interface TemplatePhaseWithPackages extends TemplatePhase {
  packages: TemplatePackageWithTasks[]
}

/**
 * Full template with complete hierarchy
 */
export interface TemplateWithHierarchy extends Template {
  phases: TemplatePhaseWithPackages[]
  dependencies: TemplateDependency[]
  quality_gates: TemplateQualityGate[]
}

// =============================================
// API INPUT TYPES
// =============================================

/**
 * Input for creating a new template
 */
export interface CreateTemplateInput {
  name: string
  description?: string
  category: TemplateCategory
  scope: TemplateScope
  target_room_type?: RoomType
}

/**
 * Input for updating a template
 */
export interface UpdateTemplateInput {
  name?: string
  description?: string
  category?: TemplateCategory
  scope?: TemplateScope
  target_room_type?: RoomType | null
  is_active?: boolean
}

/**
 * Input for creating a template phase
 */
export interface CreateTemplatePhaseInput {
  template_id: string
  name: string
  description?: string
  wbs_code: string
  sort_order?: number
}

/**
 * Input for creating a template package
 */
export interface CreateTemplatePackageInput {
  phase_id: string
  name: string
  description?: string
  wbs_code: string
  sort_order?: number
  trade_category?: TradeCategory
}

/**
 * Input for creating a template task
 */
export interface CreateTemplateTaskInput {
  package_id: string
  name: string
  description?: string
  wbs_code: string
  sort_order?: number
  estimated_duration_days?: number
  estimated_cost?: number
  trade_category?: TradeCategory
  is_optional?: boolean
  materials_list?: TemplateMaterialItem[]
  notes?: string
  checklist_template?: TemplateChecklistItem[]
}

/**
 * Input for creating a dependency
 */
export interface CreateTemplateDependencyInput {
  template_id: string
  predecessor_task_id: string
  successor_task_id: string
  dependency_type?: DependencyType
  lag_days?: number
}

/**
 * Input for creating a quality gate
 */
export interface CreateTemplateQualityGateInput {
  template_id: string
  gate_level: GateLevel
  phase_id?: string
  package_id?: string
  name: string
  description?: string
  checklist_items?: TemplateChecklistItem[]
  min_photos_required?: number
  photo_types?: string[]
  is_blocking?: boolean
  auto_approve_when_complete?: boolean
}

// =============================================
// API RESPONSE TYPES
// =============================================

/**
 * Response for template list
 */
export interface TemplatesResponse {
  templates: Template[]
}

/**
 * Response for single template
 */
export interface TemplateResponse {
  template: Template
}

/**
 * Response for template with full hierarchy
 */
export interface TemplateWithHierarchyResponse {
  template: TemplateWithHierarchy
}

/**
 * Response for template phases list
 */
export interface TemplatePhasesResponse {
  phases: TemplatePhase[]
}

/**
 * Response for template packages list
 */
export interface TemplatePackagesResponse {
  packages: TemplatePackage[]
}

/**
 * Response for template tasks list
 */
export interface TemplateTasksResponse {
  tasks: TemplateTask[]
}

/**
 * Response for dependencies list
 */
export interface TemplateDependenciesResponse {
  dependencies: TemplateDependency[]
}

/**
 * Response for quality gates list
 */
export interface TemplateQualityGatesResponse {
  quality_gates: TemplateQualityGate[]
}

// =============================================
// PROJECT RUNTIME TYPES
// =============================================

/**
 * Project quality gate status
 */
export type QualityGateStatus = 'pending' | 'passed' | 'failed'

/**
 * Checklist item progress tracking
 */
export interface ChecklistProgress {
  id: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
}

/**
 * Project quality gate (runtime instance from template)
 */
export interface ProjectQualityGate {
  id: string
  project_id: string
  template_gate_id: string | null
  gate_level: GateLevel
  phase_id: string | null
  package_id: string | null
  name: string
  description: string | null
  checklist_items: TemplateChecklistItem[]
  checklist_progress: ChecklistProgress[] | null
  min_photos_required: number
  photo_types: string[]
  is_blocking: boolean
  auto_approve_when_complete: boolean
  status: QualityGateStatus
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Quality gate completion status for display
 */
export interface QualityGateCompletion {
  checklist_complete: boolean
  checklist_progress: string  // e.g., "3/5"
  photos_complete: boolean
  photos_progress: string  // e.g., "2/3"
  is_complete: boolean
  can_auto_approve: boolean
}

/**
 * Media attachment for quality gate photos
 */
export interface QualityGatePhoto {
  id: string
  file_name: string
  storage_path: string
  created_at?: string
}

/**
 * Project quality gate with completion tracking
 */
export interface ProjectQualityGateWithCompletion extends ProjectQualityGate {
  completion: QualityGateCompletion
  photos: QualityGatePhoto[]
  phase?: {
    id: string
    name: string
    wbs_code: string
    status: string
  } | null
  package?: {
    id: string
    name: string
    wbs_code: string
    status: string
  } | null
}

/**
 * Response for project quality gates list
 */
export interface ProjectQualityGatesResponse {
  quality_gates: ProjectQualityGateWithCompletion[]
}

/**
 * Response for single project quality gate
 */
export interface ProjectQualityGateResponse {
  quality_gate: ProjectQualityGateWithCompletion
}
