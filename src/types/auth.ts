/**
 * Authentication and Authorization Types
 *
 * Types for RBAC, session management, and multi-auth support.
 */

// =============================================
// ROLE TYPES
// =============================================

/**
 * User role enum values (matching database user_role enum)
 */
export type UserRole =
  | 'admin'
  | 'property_manager'
  | 'accounting'
  | 'tenant'
  | 'external_contractor'

/**
 * Legacy role type (for backward compatibility)
 */
export type LegacyRole = 'kewa' | 'imeri'

/**
 * Role entity from database
 */
export interface Role {
  id: string
  name: UserRole
  display_name: string
  description: string | null
  is_internal: boolean
  is_active: boolean
  created_at: string
}

// =============================================
// PERMISSION TYPES
// =============================================

/**
 * Permission entity from database
 */
export interface Permission {
  id: string
  code: string // e.g., 'projects:create'
  name: string
  description: string | null
  resource: string
  action: string
  created_at: string
}

/**
 * Role-Permission junction from database
 */
export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

/**
 * Role with permissions (for session creation)
 */
export interface RoleWithPermissions extends Role {
  permissions: string[] // Array of permission codes
}

// =============================================
// AUTH METHOD TYPES
// =============================================

/**
 * Authentication method enum values
 */
export type AuthMethod = 'pin' | 'email_password' | 'magic_link'

// =============================================
// SESSION TYPES
// =============================================

/**
 * Session data stored in JWT
 */
export interface SessionData {
  userId: string
  role: LegacyRole // Legacy role for backward compat
  roleId: string | null
  roleName: UserRole
  permissions: string[]
}

/**
 * Validated session (legacy format)
 */
export interface ValidatedSession {
  userId: string
  role: LegacyRole
}

/**
 * Validated session with full RBAC data
 */
export interface ValidatedSessionWithRBAC extends ValidatedSession {
  roleId: string | null
  roleName: UserRole
  permissions: string[]
}

// =============================================
// MAGIC LINK TYPES
// =============================================

/**
 * Magic link token purpose
 */
export type MagicLinkPurpose =
  | 'work_order_access'
  | 'login'
  | 'password_reset'

/**
 * Magic link token from database
 */
export interface MagicLinkToken {
  id: string
  token: string
  user_id: string | null
  work_order_id: string | null
  email: string
  purpose: MagicLinkPurpose
  expires_at: string
  used_at: string | null
  is_revoked: boolean
  created_at: string
  created_by: string | null
}

/**
 * Magic link validation result
 */
export interface MagicLinkValidationResult {
  is_valid: boolean
  user_id: string | null
  work_order_id: string | null
  email: string | null
  purpose: MagicLinkPurpose | null
  error_message: string | null
}

// =============================================
// TENANT TYPES
// =============================================

/**
 * Tenant-Unit relationship from database
 */
export interface TenantUser {
  id: string
  user_id: string
  unit_id: string
  is_primary: boolean
  move_in_date: string | null
  move_out_date: string | null
  created_at: string
}

/**
 * Tenant with unit details
 */
export interface TenantWithUnit extends TenantUser {
  user: {
    id: string
    email: string
    display_name: string
  }
  unit: {
    id: string
    name: string
    building_id: string
  }
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

/**
 * Login request body
 */
export interface LoginRequest {
  pin?: string // For PIN auth
  email?: string // For email+password auth
  password?: string
}

/**
 * Login response
 */
export interface LoginResponse {
  success: boolean
  role?: LegacyRole
  roleName?: UserRole
  displayName?: string
  isInternal?: boolean
  emailVerified?: boolean
}

/**
 * Register request body
 */
export interface RegisterRequest {
  email: string
  password: string
  displayName: string
  roleName: 'tenant' | 'external_contractor' | 'accounting'
  unitId?: string // Required for tenants
}

/**
 * Register response
 */
export interface RegisterResponse {
  success: boolean
  user?: {
    id: string
    email: string
    displayName: string
    role: UserRole
  }
}

/**
 * Magic link send request
 */
export interface MagicLinkSendRequest {
  email: string
  workOrderId: string
  expiresHours?: number
}

/**
 * Magic link send response
 */
export interface MagicLinkSendResponse {
  success: boolean
  token?: string
  url?: string
  expiresAt?: string
  mailtoLink?: string
}

/**
 * Magic link verify request
 */
export interface MagicLinkVerifyRequest {
  token: string
}

/**
 * Magic link verify response
 */
export interface MagicLinkVerifyResponse {
  success: boolean
  workOrderId?: string
  redirectUrl?: string
  error?: string
}

/**
 * Session check response
 */
export interface SessionCheckResponse {
  authenticated: boolean
  userId?: string
  role?: LegacyRole
  roleName?: UserRole
  permissions?: string[]
}

// =============================================
// AUDIT TYPES
// =============================================

/**
 * Authentication audit event types
 */
export type AuthAuditAction =
  | 'auth.login.pin.success'
  | 'auth.login.pin.failure'
  | 'auth.login.email.success'
  | 'auth.login.email.failure'
  | 'auth.login.magic_link.success'
  | 'auth.login.magic_link.failure'
  | 'auth.login.magic_link.expired'
  | 'auth.logout'
  | 'auth.session.created'
  | 'auth.session.expired'
  | 'auth.password.changed'
  | 'auth.password.reset.requested'
  | 'auth.magic_link.sent'
  | 'auth.magic_link.revoked'

/**
 * Auth audit log entry
 */
export interface AuthAuditLog {
  id: string
  action: AuthAuditAction
  user_id: string | null
  ip_address: string | null
  user_agent: string | null
  details: Record<string, unknown>
  created_at: string
}
