/**
 * Database types matching Supabase schema (001_initial_schema.sql)
 *
 * These interfaces represent the database tables and are used
 * for type-safe Supabase queries throughout the application.
 */

import type { Role, UnitType, TaskStatus, Priority, ProjectStatus } from './index'

// =============================================
// BASE DATABASE ENTITIES
// =============================================

/**
 * User with PIN-based authentication
 */
export interface User {
  id: string
  pin_hash: string
  role: Role
  display_name: string
  created_at: string
}

/**
 * Building/Liegenschaft
 */
export interface Building {
  id: string
  name: string
  address: string | null
  created_at: string
}

/**
 * Unit: Apartment, common area, or entire building
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
  created_at: string
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
  created_at: string
}

/**
 * Task within a project
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
  created_at: string
  updated_at: string
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
 * Input for creating a new task
 */
export interface CreateTaskInput {
  project_id: string
  title: string
  description?: string
  due_date?: string
  priority?: Priority
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
