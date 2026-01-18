/**
 * Database types matching Supabase schema (001_initial_schema.sql)
 *
 * These interfaces represent the database tables and are used
 * for type-safe Supabase queries throughout the application.
 */

import type {
  Role,
  UnitType,
  TaskStatus,
  Priority,
  ProjectStatus,
  RoomType,
  RoomCondition,
  ComponentType,
  RenovationStatus,
  WorkOrderStatus,
  PartnerType,
  TradeCategory,
  MediaType,
  MediaContext,
  AuditAction,
  OfferStatus,
  InvoiceStatus,
  ExpenseCategory,
  ExpensePaymentMethod,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  AuthMethod,
  ParkingStatus
} from './index'

// =============================================
// BASE DATABASE ENTITIES
// =============================================

/**
 * User with multi-auth support (v2.0)
 */
export interface User {
  id: string
  pin_hash: string
  role: Role // Legacy role field
  display_name: string
  // v2.0 auth fields (optional for backward compat)
  role_id?: string | null
  email?: string | null
  email_verified?: boolean
  password_hash?: string | null
  auth_method?: AuthMethod
  last_login_at?: string | null
  login_count?: number
  is_active?: boolean
  created_at: string
  updated_at?: string
}

/**
 * Role table (v2.0 RBAC)
 */
export interface DbRole {
  id: string
  name: UserRole
  display_name: string
  description: string | null
  is_internal: boolean
  is_active: boolean
  created_at: string
}

/**
 * Permission table (v2.0 RBAC)
 */
export interface DbPermission {
  id: string
  code: string
  name: string
  description: string | null
  resource: string
  action: string
  created_at: string
}

/**
 * Role-Permission junction (v2.0 RBAC)
 */
export interface DbRolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

/**
 * Tenant-Unit relationship (v2.0)
 */
export interface DbTenantUser {
  id: string
  user_id: string
  unit_id: string
  is_primary: boolean
  move_in_date: string | null
  move_out_date: string | null
  created_at: string
}

/**
 * Property (Liegenschaft) - top-level entity containing buildings
 */
export interface Property {
  id: string
  name: string
  address: string | null
  description: string | null
  created_at: string
  updated_at: string
}

/**
 * Building/Liegenschaft
 */
export interface Building {
  id: string
  property_id: string | null
  name: string
  address: string | null
  created_at: string
  updated_at: string
}

/**
 * Unit: Apartment, common area, parking spot, or entire building
 */
export interface Unit {
  id: string
  building_id: string
  name: string
  unit_type: UnitType
  floor: number | null
  position: string | null
  tenant_name: string | null
  tenant_visible_to_imeri: boolean
  rent_amount: number | null
  rent_currency: string
  parking_number: number | null
  parking_status: ParkingStatus | null
  created_at: string
  updated_at: string
}

/**
 * Parking spot - Unit with unit_type='parking_spot'
 * Type alias for clarity when working specifically with parking data
 */
export type ParkingSpot = Unit & {
  unit_type: 'parking_spot'
  parking_number: number
  parking_status: ParkingStatus
}

/**
 * Room within a unit
 */
export interface Room {
  id: string
  unit_id: string
  name: string
  room_type: RoomType
  condition: RoomCondition
  condition_updated_at: string | null
  condition_source_project_id: string | null
  area_sqm: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Component within a room (floor, walls, windows, etc.)
 */
export interface Component {
  id: string
  room_id: string
  name: string
  component_type: ComponentType
  condition: RoomCondition
  condition_updated_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Project within a unit (e.g., Badezimmer, Kueche)
 */
export interface Project {
  id: string
  unit_id: string
  name: string
  description: string | null
  status: ProjectStatus
  visible_to_imeri: boolean
  archived_at: string | null
  created_at: string
}

/**
 * Task within a project
 * Note: v2.0 fields (parent_task_id, checklist_items, etc.) are optional
 * for backward compatibility with existing database records and API responses.
 */
export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  due_date: string | null
  completed_at: string | null
  completion_note: string | null
  recurring_type: 'none' | 'weekly' | 'monthly'
  // v2.0 fields (optional for backward compatibility)
  parent_task_id?: string | null
  checklist_items?: ChecklistItem[]
  estimated_hours?: number | null
  actual_hours?: number | null
  room_id?: string | null
  renovation_project_id?: string | null
  created_at: string
  updated_at: string
}

/**
 * Checklist item structure (stored as JSONB in tasks.checklist_items)
 */
export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  completed_at: string | null
}

/**
 * Task dependency relationship
 */
export interface TaskDependency {
  id: string
  task_id: string
  depends_on_task_id: string
  created_at: string
}

/**
 * Renovation project with full workflow
 */
export interface RenovationProject {
  id: string
  unit_id: string
  template_id: string | null
  name: string
  description: string | null
  status: RenovationStatus
  planned_start_date: string | null
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  estimated_cost: number | null
  actual_cost: number | null
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  visible_to_imeri: boolean
  created_at: string
  updated_at: string
}

/**
 * Work order for external contractor assignments
 */
export interface WorkOrder {
  id: string
  renovation_project_id: string | null
  task_id: string | null
  room_id: string | null
  partner_id: string | null
  title: string
  description: string | null
  scope_of_work: string | null
  status: WorkOrderStatus
  requested_start_date: string | null
  requested_end_date: string | null
  proposed_start_date: string | null
  proposed_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  access_token: string
  token_expires_at: string | null
  acceptance_deadline: string | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  estimated_cost: number | null
  proposed_cost: number | null
  final_cost: number | null
  internal_notes: string | null
  contractor_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Partner (contractor or supplier)
 */
export interface Partner {
  id: string
  partner_type: PartnerType
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  trade_categories: TradeCategory[]
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Media attachment (unified for all entities)
 */
export interface Media {
  id: string
  entity_type: string
  entity_id: string
  media_type: MediaType
  context: MediaContext
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  description: string | null
  taken_at: string | null
  duration_seconds: number | null
  transcription: string | null
  transcription_status: string | null
  uploaded_by: string | null
  created_at: string
}

/**
 * Audit log entry for change tracking
 */
export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: AuditAction
  user_id: string | null
  user_role: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changed_fields: string[] | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// =============================================
// EXTENDED TYPES (with relations/aggregations)
// =============================================

/**
 * Unit with task statistics for dashboard views
 */
export interface UnitWithStats extends Unit {
  open_tasks_count: number
  total_tasks_count: number
}

/**
 * Task with related project and unit information
 */
export interface TaskWithProject extends Task {
  project: {
    id: string
    name: string
    unit_id: string
    visible_to_imeri: boolean
  }
  unit: {
    id: string
    name: string
    unit_type: UnitType
    floor: number | null
  }
}

/**
 * Project with related unit information
 */
export interface ProjectWithUnit extends Project {
  unit: {
    id: string
    name: string
    unit_type: UnitType
    floor: number | null
  }
}

// =============================================
// API INPUT TYPES
// =============================================

/**
 * Recurring type for tasks
 */
export type RecurringType = 'none' | 'weekly' | 'monthly'

/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
  project_id: string
  title: string
  description?: string
  due_date?: string
  priority?: Priority
  recurring_type?: RecurringType
}

/**
 * Input for updating an existing task
 */
export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  due_date?: string | null
  completion_note?: string
  recurring_type?: 'none' | 'weekly' | 'monthly'
}

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  unit_id: string
  name: string
  description?: string
  visible_to_imeri?: boolean
}

/**
 * Input for updating an existing project
 */
export interface UpdateProjectInput {
  name?: string
  description?: string
  status?: ProjectStatus
  visible_to_imeri?: boolean
}

/**
 * Input for updating a unit
 */
export interface UpdateUnitInput {
  tenant_name?: string | null
  tenant_visible_to_imeri?: boolean
}

// =============================================
// API RESPONSE TYPES
// =============================================

/**
 * Response for GET /api/units
 */
export interface UnitsResponse {
  units: UnitWithStats[]
}

/**
 * Response for single unit operations
 */
export interface UnitResponse {
  unit: UnitWithStats
}

/**
 * Response for GET /api/tasks
 */
export interface TasksResponse {
  tasks: TaskWithProject[]
}

/**
 * Response for single task operations
 */
export interface TaskResponse {
  task: Task | TaskWithProject
}

/**
 * Response for GET /api/projects
 */
export interface ProjectsResponse {
  projects: ProjectWithUnit[]
}

/**
 * Response for single project operations
 */
export interface ProjectResponse {
  project: Project | ProjectWithUnit
}

/**
 * Generic success response for DELETE operations
 */
export interface SuccessResponse {
  success: boolean
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: string
}

// =============================================
// PHOTO TYPES
// =============================================

/**
 * Photo type distinguishing explanation from completion photos
 */
export type PhotoType = 'explanation' | 'completion'

/**
 * Photo attachment for task documentation
 */
export interface TaskPhoto {
  id: string
  task_id: string
  photo_type: PhotoType
  storage_path: string
  file_name: string
  file_size: number
  uploaded_by: string
  created_at: string
}

/**
 * TaskPhoto with resolved storage URL
 */
export interface TaskPhotoWithUrl extends TaskPhoto {
  url: string
}

/**
 * Input for creating a photo (client-side)
 */
export interface CreatePhotoInput {
  task_id: string
  photo_type: PhotoType
  file: File
}

/**
 * Response for GET /api/photos
 */
export interface PhotosResponse {
  photos: TaskPhotoWithUrl[]
}

/**
 * Response for single photo operations
 */
export interface PhotoResponse {
  photo: TaskPhotoWithUrl
}

// =============================================
// AUDIO TYPES
// =============================================

/**
 * Audio type distinguishing explanation from emergency audio
 */
export type AudioType = 'explanation' | 'emergency'

/**
 * Transcription status for audio files
 */
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Audio attachment for task voice notes
 */
export interface TaskAudio {
  id: string
  task_id: string
  audio_type: AudioType
  storage_path: string
  file_name: string
  file_size: number
  duration_seconds: number | null
  transcription: string | null
  transcription_status: TranscriptionStatus
  uploaded_by: string
  created_at: string
}

/**
 * TaskAudio with resolved storage URL
 */
export interface TaskAudioWithUrl extends TaskAudio {
  url: string
}

/**
 * Input for creating audio (client-side)
 */
export interface CreateAudioInput {
  task_id: string
  audio_type: AudioType
  file: File
}

/**
 * Response for GET /api/audio
 */
export interface AudiosResponse {
  audios: TaskAudioWithUrl[]
}

/**
 * Response for single audio operations
 */
export interface AudioResponse {
  audio: TaskAudioWithUrl
}

// =============================================
// COST & FINANCE ENTITIES (Phase 07-03)
// =============================================

/**
 * Offer line item structure (stored as JSONB)
 */
export interface OfferLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

/**
 * Offer from contractor/supplier (Offerte)
 */
export interface Offer {
  id: string
  partner_id: string
  work_order_id: string | null
  renovation_project_id: string | null
  offer_number: string | null
  title: string
  description: string | null
  amount: number
  currency: string
  tax_rate: number
  tax_amount: number | null
  total_amount: number | null
  line_items: OfferLineItem[]
  status: OfferStatus
  offer_date: string | null
  valid_until: string | null
  received_at: string | null
  reviewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  accepted_by: string | null
  rejected_by: string | null
  rejection_reason: string | null
  document_storage_path: string | null
  internal_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Invoice line item structure (stored as JSONB)
 */
export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

/**
 * Invoice from partner (Rechnung)
 */
export interface Invoice {
  id: string
  partner_id: string
  offer_id: string | null
  work_order_id: string | null
  renovation_project_id: string | null
  invoice_number: string
  title: string | null
  description: string | null
  amount: number
  currency: string
  tax_rate: number
  tax_amount: number | null
  total_amount: number | null
  amount_paid: number
  amount_outstanding: number | null
  line_items: InvoiceLineItem[]
  status: InvoiceStatus
  invoice_date: string
  due_date: string | null
  received_at: string | null
  approved_at: string | null
  paid_at: string | null
  approved_by: string | null
  offer_amount: number | null
  variance_amount: number | null
  variance_reason: string | null
  document_storage_path: string
  internal_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Expense entry (cash, petty cash, travel, etc.)
 */
export interface Expense {
  id: string
  renovation_project_id: string | null
  work_order_id: string | null
  unit_id: string | null
  room_id: string | null
  title: string
  description: string | null
  category: ExpenseCategory
  amount: number
  currency: string
  tax_included: boolean
  payment_method: ExpensePaymentMethod
  paid_by: string | null
  paid_at: string | null
  vendor_name: string | null
  partner_id: string | null
  receipt_storage_path: string | null
  receipt_number: string | null
  trade_category: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Payment against an invoice
 */
export interface Payment {
  id: string
  invoice_id: string
  amount: number
  currency: string
  payment_method: PaymentMethod
  status: PaymentStatus
  bank_reference: string | null
  bank_account: string | null
  payment_date: string
  value_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// =============================================
// COST VIEW RESULT TYPES
// =============================================

/**
 * Project cost summary (from project_costs view)
 */
export interface ProjectCosts {
  project_id: string
  project_name: string
  unit_id: string
  estimated_cost: number | null
  total_accepted_offers: number
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  total_expenses: number
  total_cost: number
  variance_from_budget: number
}

/**
 * Unit cost summary (from unit_costs view)
 */
export interface UnitCosts {
  unit_id: string
  unit_name: string
  rent_amount: number | null
  total_project_costs: number
  direct_expenses: number
  total_investment: number
  years_to_recover: number | null
}

/**
 * Partner cost summary (from partner_costs view)
 */
export interface PartnerCosts {
  partner_id: string
  company_name: string
  partner_type: string
  total_offers: number
  accepted_offers: number
  total_offer_value: number
  total_invoices: number
  total_invoiced: number
  total_paid: number
  outstanding: number
  avg_variance: number | null
}

/**
 * Trade cost summary (from trade_costs view)
 */
export interface TradeCosts {
  trade_category: string
  expense_count: number
  expense_total: number
  invoice_count: number
  invoice_total: number
  combined_total: number
}

/**
 * Monthly cost trend (from monthly_costs view)
 */
export interface MonthlyCosts {
  month: string
  cost_type: 'expense' | 'invoice'
  category: string
  amount: number
}

// =============================================
// COST API INPUT/RESPONSE TYPES
// =============================================

/**
 * Input for creating an offer
 */
export interface CreateOfferInput {
  partner_id: string
  work_order_id?: string
  renovation_project_id?: string
  offer_number?: string
  title: string
  description?: string
  amount: number
  tax_rate?: number
  line_items?: OfferLineItem[]
  offer_date?: string
  valid_until?: string
}

/**
 * Input for creating an invoice
 */
export interface CreateInvoiceInput {
  partner_id: string
  offer_id?: string
  work_order_id?: string
  renovation_project_id?: string
  invoice_number: string
  title?: string
  description?: string
  amount: number
  tax_rate?: number
  line_items?: InvoiceLineItem[]
  invoice_date: string
  due_date?: string
  document_storage_path: string
}

/**
 * Input for creating an expense
 */
export interface CreateExpenseInput {
  renovation_project_id?: string
  work_order_id?: string
  unit_id?: string
  room_id?: string
  title: string
  description?: string
  category: ExpenseCategory
  amount: number
  payment_method: ExpensePaymentMethod
  vendor_name?: string
  partner_id?: string
  receipt_storage_path?: string
  receipt_number?: string
  trade_category?: string
  notes?: string
}

/**
 * Input for creating a payment
 */
export interface CreatePaymentInput {
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  value_date?: string
  bank_reference?: string
  notes?: string
}

/**
 * Response for offer operations
 */
export interface OfferResponse {
  offer: Offer
}

/**
 * Response for invoice operations
 */
export interface InvoiceResponse {
  invoice: Invoice
}

/**
 * Response for expense operations
 */
export interface ExpenseResponse {
  expense: Expense
}

/**
 * Response for payment operations
 */
export interface PaymentResponse {
  payment: Payment
}

// =============================================
// CONDITION TRACKING ENTITIES (Phase 07-05)
// =============================================

/**
 * Condition history record for room/unit/component changes
 */
export interface ConditionHistory {
  id: string
  entity_type: 'room' | 'unit' | 'component'
  entity_id: string
  old_condition: RoomCondition | null
  new_condition: RoomCondition
  source_project_id: string | null
  source_work_order_id: string | null
  media_ids: string[] | null
  notes: string | null
  changed_by: string | null
  changed_at: string
}

/**
 * Unit condition summary (from view)
 */
export interface UnitConditionSummary {
  unit_id: string
  unit_name: string
  building_id: string
  total_rooms: number
  new_rooms: number
  partial_rooms: number
  old_rooms: number
  renovation_percentage: number | null
  overall_condition: RoomCondition | null
  last_condition_update: string | null
}

/**
 * System setting entry
 */
export interface SystemSetting {
  key: string
  value: unknown
  description: string | null
  updated_at: string
  updated_by: string | null
}

/**
 * Storage metadata record
 */
export interface StorageMetadata {
  id: string
  bucket_name: string
  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  checksum: string | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  has_thumbnail: boolean
  thumbnail_path: string | null
  entity_type: string | null
  entity_id: string | null
  uploaded_by: string | null
  uploaded_at: string
  marked_for_deletion: boolean
  deletion_scheduled_at: string | null
}

/**
 * Magic link token record
 */
export interface MagicLinkToken {
  id: string
  token: string
  user_id: string | null
  work_order_id: string | null
  email: string
  purpose: string
  expires_at: string
  used_at: string | null
  is_revoked: boolean
  created_at: string
  created_by: string | null
}

// =============================================
// TEMPLATE SYSTEM TYPES (Phase 08)
// =============================================

// Re-export all template types from templates.ts
export type {
  TemplateMaterialItem,
  TemplateChecklistItem,
  Template,
  TemplatePhase,
  TemplatePackage,
  TemplateTask,
  TemplateDependency,
  TemplateQualityGate,
  TemplateTaskWithPackage,
  TemplatePackageWithTasks,
  TemplatePhaseWithPackages,
  TemplateWithHierarchy,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateTemplatePhaseInput,
  CreateTemplatePackageInput,
  CreateTemplateTaskInput,
  CreateTemplateDependencyInput,
  CreateTemplateQualityGateInput,
  TemplatesResponse,
  TemplateResponse,
  TemplateWithHierarchyResponse,
  TemplatePhasesResponse,
  TemplatePackagesResponse,
  TemplateTasksResponse,
  TemplateDependenciesResponse,
  TemplateQualityGatesResponse
} from './templates'
