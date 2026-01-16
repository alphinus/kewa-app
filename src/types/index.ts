/**
 * Shared TypeScript types for the KEWA-Imeri App
 */

// User roles
export type Role = 'kewa' | 'imeri'

// User representation
export interface User {
  id: string
  role: Role
  displayName: string
}

// Session state
export interface Session {
  authenticated: boolean
  user?: User
}

// Building hierarchy types
export type UnitType = 'apartment' | 'common_area' | 'building'

// Task management types
export type TaskStatus = 'open' | 'completed'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type ProjectStatus = 'active' | 'completed' | 'archived'

// API response for session check
export interface SessionResponse {
  authenticated: boolean
  role?: Role
  userId?: string
}
