/**
 * Notification Types
 *
 * Types for notification system with push subscriptions and user preferences.
 * Phase: 24-push-notifications
 */

// =============================================
// TYPE UNIONS
// =============================================

/**
 * Notification type categories
 */
export type NotificationType =
  | 'work_order_status'
  | 'approval_needed'
  | 'deadline_reminder'

/**
 * Notification urgency levels
 */
export type UrgencyLevel = 'urgent' | 'normal' | 'info'

/**
 * Entity types that can generate notifications
 */
export type EntityType = 'work_order' | 'invoice' | 'change_order'

// =============================================
// ENTITY TYPES
// =============================================

/**
 * Notification entity (shared content)
 */
export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  entity_type: EntityType
  entity_id: string
  actor_id: string | null
  urgency: UrgencyLevel
  url: string
  created_at: string
}

/**
 * User notification with read tracking
 */
export interface UserNotification {
  id: string
  user_id: string
  notification_id: string
  read_at: string | null
  created_at: string
  notification?: Notification
}

/**
 * Push subscription JSON structure from browser API
 */
export interface PushSubscriptionJSON {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Push subscription database record
 */
export interface PushSubscriptionRecord {
  id: string
  user_id: string
  device_id: string
  subscription_data: PushSubscriptionJSON
  enabled: boolean
  created_at: string
  last_used_at: string
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  user_id: string
  work_order_status_enabled: boolean
  approval_needed_enabled: boolean
  deadline_reminder_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  timezone: string
  digest_enabled: boolean
  digest_time: string
  created_at: string
  updated_at: string
}

// =============================================
// INPUT TYPES
// =============================================

/**
 * Input for creating a notification
 */
export interface CreateNotificationInput {
  type: NotificationType
  title: string
  body: string
  entity_type: EntityType
  entity_id: string
  actor_id?: string
  urgency?: UrgencyLevel
  url: string
}

/**
 * Input for sending a notification to target users
 */
export interface SendNotificationInput extends CreateNotificationInput {
  targetUserIds: string[]
}

/**
 * Input for subscribing to push notifications
 */
export interface SubscribePushInput {
  subscription: PushSubscriptionJSON
  deviceId: string
}

/**
 * Input for updating notification preferences
 */
export interface UpdatePreferencesInput {
  work_order_status_enabled?: boolean
  approval_needed_enabled?: boolean
  deadline_reminder_enabled?: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  timezone?: string
  digest_enabled?: boolean
  digest_time?: string
}

// =============================================
// RESPONSE TYPES
// =============================================

/**
 * Response for GET /api/notifications
 */
export interface NotificationsResponse {
  notifications: UserNotification[]
  total: number
  unread_count: number
}

/**
 * Response for GET /api/notifications/preferences
 */
export interface PreferencesResponse {
  preferences: NotificationPreferences
}

/**
 * Response for push subscription endpoints
 */
export interface SubscribeResponse {
  success: boolean
}

// =============================================
// ROLE-BASED NOTIFICATION TYPES
// =============================================

/**
 * Maps user roles to available notification types
 * Used for preference UI and routing logic
 */
export const ROLE_NOTIFICATION_TYPES: Record<string, NotificationType[]> = {
  admin: ['work_order_status', 'approval_needed', 'deadline_reminder'],
  property_manager: ['work_order_status', 'approval_needed', 'deadline_reminder'],
  accounting: ['approval_needed', 'deadline_reminder'],
  tenant: [],
  external_contractor: ['work_order_status'],
}
