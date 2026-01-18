/**
 * Template System types (Phase 08)
 *
 * These interfaces represent the template tables and related
 * structures for the WBS-based renovation template system.
 */

import type {
  RoomType,
  TradeCategory
} from './index'

// =============================================
// ENUM TYPES (matching database)
// =============================================

// Template categorization
export type TemplateCategory =
  | 'complete_renovation'    // Komplett-Renovation
  | 'room_specific'          // Raum-spezifisch (Bad, Kueche, etc.)
  | 'trade_specific'         // Gewerk-spezifisch (Malerarbeiten, etc.)

// Template scope
export type TemplateScope = 'unit' | 'room'

// Dependency types (standard project management)
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'

// Quality gate levels
export type GateLevel = 'package' | 'phase'

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
