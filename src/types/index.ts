/**
 * Shared TypeScript types for the KEWA-Imeri App
 */

// =============================================
// LEGACY TYPES (for backward compatibility)
// =============================================

// Legacy user roles (kept for backward compatibility)
export type Role = 'kewa' | 'imeri'

// Legacy user representation
export interface User {
  id: string
  role: Role
  displayName: string
}

// Legacy session state
export interface Session {
  authenticated: boolean
  user?: User
}

// =============================================
// V2.0 RBAC TYPES (Phase 07-04)
// =============================================

// New RBAC user roles
export type UserRole =
  | 'admin'
  | 'property_manager'
  | 'accounting'
  | 'tenant'
  | 'external_contractor'

// Authentication methods
export type AuthMethod = 'pin' | 'email_password' | 'magic_link'

// Re-export auth types
export type {
  Role as RoleEntity,
  Permission,
  RolePermission,
  RoleWithPermissions,
  SessionData,
  ValidatedSession,
  ValidatedSessionWithRBAC,
  MagicLinkPurpose,
  MagicLinkToken,
  TenantUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  AuthAuditAction,
  AuthAuditLog
} from './auth'

// Building hierarchy types
export type UnitType = 'apartment' | 'common_area' | 'building' | 'parking_spot'

// Parking spot status
export type ParkingStatus = 'free' | 'occupied' | 'maintenance'

// Task management types
export type TaskStatus = 'open' | 'completed'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type ProjectStatus = 'active' | 'completed' | 'archived'

// =============================================
// V2.0 DATA MODEL TYPES (Phase 07-02)
// =============================================

// Room types for classification
export type RoomType =
  | 'bathroom'
  | 'kitchen'
  | 'bedroom'
  | 'living_room'
  | 'hallway'
  | 'balcony'
  | 'storage'
  | 'laundry'
  | 'garage'
  | 'office'
  | 'other'

// Room/component condition for Digital Twin
export type RoomCondition = 'old' | 'partial' | 'new'

// Component types for granular tracking
export type ComponentType =
  | 'floor'
  | 'walls'
  | 'ceiling'
  | 'windows'
  | 'doors'
  | 'electrical'
  | 'plumbing'
  | 'heating'
  | 'ventilation'
  | 'kitchen_appliances'
  | 'bathroom_fixtures'
  | 'other'

// Renovation project status workflow
export type RenovationStatus =
  | 'planned'
  | 'active'
  | 'blocked'
  | 'finished'
  | 'approved'

// Work order status workflow (for external contractors)
export type WorkOrderStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'done'
  | 'inspected'
  | 'closed'

// Partner types
export type PartnerType = 'contractor' | 'supplier'

// Trade categories for contractors
export type TradeCategory =
  | 'general'
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'painting'
  | 'flooring'
  | 'carpentry'
  | 'roofing'
  | 'masonry'
  | 'glazing'
  | 'landscaping'
  | 'cleaning'
  | 'demolition'
  | 'other'

// Media types
export type MediaType = 'photo' | 'video' | 'document' | 'audio'
export type MediaContext = 'before' | 'after' | 'during' | 'documentation' | 'other'

// Audit action types
export type AuditAction = 'create' | 'update' | 'delete' | 'archive' | 'restore'

// =============================================
// COST & FINANCE TYPES (Phase 07-03)
// =============================================

// Offer status workflow
export type OfferStatus =
  | 'draft'
  | 'sent'
  | 'received'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'superseded'

// Invoice status workflow
export type InvoiceStatus =
  | 'received'
  | 'under_review'
  | 'approved'
  | 'disputed'
  | 'partially_paid'
  | 'paid'
  | 'cancelled'

// Expense categories for classification
export type ExpenseCategory =
  | 'material'
  | 'labor'
  | 'equipment_rental'
  | 'travel'
  | 'permits'
  | 'disposal'
  | 'utilities'
  | 'other'

// Expense payment methods
export type ExpensePaymentMethod =
  | 'cash'
  | 'petty_cash'
  | 'company_card'
  | 'personal_reimbursement'

// Payment methods for invoices
export type PaymentMethod =
  | 'bank_transfer'
  | 'cash'
  | 'check'
  | 'credit_card'
  | 'debit_card'
  | 'other'

// Payment status
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'

// API response for session check
export interface SessionResponse {
  authenticated: boolean
  role?: Role
  userId?: string
}

// =============================================
// TEMPLATE SYSTEM TYPES (Phase 08)
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
