/**
 * Portal Types
 *
 * Types for tenant portal tickets, messages, attachments, categories, and settings.
 * Phase 26: Tenant Portal Core
 */

// =============================================
// TYPE UNIONS
// =============================================

/**
 * Ticket status enum values (matching database ticket_status enum)
 */
export type TicketStatus = 'offen' | 'in_bearbeitung' | 'geschlossen' | 'storniert'

/**
 * Ticket urgency enum values (matching database ticket_urgency enum)
 */
export type TicketUrgency = 'notfall' | 'dringend' | 'normal'

/**
 * Message sender type enum values (matching database message_sender_type enum)
 */
export type MessageSenderType = 'tenant' | 'operator'

// =============================================
// APP SETTINGS
// =============================================

/**
 * App setting value type
 */
export type SettingValueType = 'string' | 'number' | 'boolean' | 'json'

/**
 * App setting from database
 */
export interface AppSetting {
  key: string
  value: string
  value_type: SettingValueType
  description: string | null
  updated_at: string
  updated_by: string | null
}

// =============================================
// TICKET CATEGORIES
// =============================================

/**
 * Ticket category from database
 */
export interface TicketCategory {
  id: string
  name: string
  display_name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// =============================================
// TICKETS
// =============================================

/**
 * Ticket from database
 */
export interface Ticket {
  id: string
  ticket_number: string
  category_id: string
  unit_id: string
  created_by: string
  title: string
  description: string
  urgency: TicketUrgency
  status: TicketStatus
  assigned_to: string | null
  closed_at: string | null
  closed_by: string | null
  cancelled_at: string | null
  last_message_at: string | null
  converted_to_wo_id: string | null
  conversion_message: string | null
  created_at: string
  updated_at: string
}

/**
 * Ticket with category details
 */
export interface TicketWithCategory extends Ticket {
  category: {
    id: string
    name: string
    display_name: string
  }
}

/**
 * Ticket with full details for list views
 */
export interface TicketWithDetails extends TicketWithCategory {
  unit: {
    id: string
    name: string
    building_id: string
  }
  message_count: number
  unread_count: number
}

// =============================================
// TICKET MESSAGES
// =============================================

/**
 * Ticket message from database
 */
export interface TicketMessage {
  id: string
  ticket_id: string
  sender_type: MessageSenderType
  created_by: string
  content: string
  read_at: string | null
  read_by: string | null
  created_at: string
}

/**
 * Ticket message with sender details
 */
export interface TicketMessageWithSender extends TicketMessage {
  sender: {
    id: string
    display_name: string
  }
}

/**
 * Ticket message with sender and attachments
 */
export interface TicketMessageWithAttachments extends TicketMessageWithSender {
  attachments: TicketAttachment[]
}

// =============================================
// TICKET ATTACHMENTS
// =============================================

/**
 * Ticket attachment from database
 */
export interface TicketAttachment {
  id: string
  ticket_id: string
  message_id: string | null
  uploaded_by: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

/**
 * Ticket attachment with resolved storage URL
 */
export interface TicketAttachmentWithUrl extends TicketAttachment {
  url: string
}

// =============================================
// INPUT TYPES
// =============================================

/**
 * Input for creating a new ticket
 */
export interface CreateTicketInput {
  category_id: string
  title: string
  description: string
  urgency?: TicketUrgency
}

/**
 * Input for creating a message
 */
export interface CreateMessageInput {
  content: string
}

/**
 * Input for updating ticket status
 */
export interface UpdateTicketStatusInput {
  status: TicketStatus
}

/**
 * Input for creating a category (admin)
 */
export interface CreateCategoryInput {
  name: string
  display_name: string
  description?: string
  sort_order?: number
}

/**
 * Input for updating a category (admin)
 */
export interface UpdateCategoryInput {
  display_name?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

/**
 * Input for updating a setting (admin)
 */
export interface UpdateSettingInput {
  value: string
}

/**
 * Input for converting a ticket to a work order
 */
export interface ConvertTicketInput {
  work_order_type: string
  partner_id: string
  description?: string
}

// =============================================
// API RESPONSE TYPES
// =============================================

/**
 * Response for GET /api/portal/tickets
 */
export interface TicketsResponse {
  tickets: TicketWithDetails[]
}

/**
 * Response for GET /api/portal/tickets/:id
 */
export interface TicketResponse {
  ticket: TicketWithDetails
}

/**
 * Response for GET /api/portal/tickets/:id/messages
 */
export interface TicketMessagesResponse {
  messages: TicketMessageWithAttachments[]
}

/**
 * Response for GET /api/portal/categories
 */
export interface TicketCategoriesResponse {
  categories: TicketCategory[]
}

/**
 * Response for GET /api/settings
 */
export interface SettingsResponse {
  settings: AppSetting[]
}

// =============================================
// CONSTANTS
// =============================================

/**
 * German labels for ticket status
 */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  geschlossen: 'Geschlossen',
  storniert: 'Storniert',
}

/**
 * German labels for ticket urgency
 */
export const TICKET_URGENCY_LABELS: Record<TicketUrgency, string> = {
  notfall: 'Notfall',
  dringend: 'Dringend',
  normal: 'Normal',
}

/**
 * Tailwind color classes for urgency badges
 */
export const TICKET_URGENCY_COLORS: Record<TicketUrgency, string> = {
  notfall: 'text-red-700 bg-red-100',
  dringend: 'text-orange-700 bg-orange-100',
  normal: 'text-blue-700 bg-blue-100',
}

/**
 * Tailwind color classes for status badges
 */
export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  offen: 'text-yellow-700 bg-yellow-100',
  in_bearbeitung: 'text-blue-700 bg-blue-100',
  geschlossen: 'text-green-700 bg-green-100',
  storniert: 'text-gray-700 bg-gray-100',
}
