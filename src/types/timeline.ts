/**
 * Timeline Types
 *
 * Unified timeline event types for displaying unit activity history.
 * Aggregates events from: renovation_projects, work_orders, condition_history, invoices
 *
 * Phase 11-01: Unit Timeline View
 * Requirement: HIST-01
 */

// =============================================
// TIMELINE EVENT TYPES
// =============================================

/**
 * Types of events that can appear in a unit timeline
 */
export type TimelineEventType = 'project' | 'work_order' | 'condition' | 'cost' | 'media'

/**
 * Unified timeline event structure
 * Normalizes events from multiple database sources into a single format
 */
export interface TimelineEvent {
  /** Unique identifier for the event */
  id: string

  /** Category of event */
  event_type: TimelineEventType

  /** Specific action within the category (e.g., 'created', 'completed', 'approved') */
  event_subtype: string

  /** Human-readable event title */
  title: string

  /** Optional detailed description */
  description?: string

  /** ID of the related entity (project, work_order, etc.) */
  entity_id: string

  /** When the event occurred (ISO 8601) */
  timestamp: string

  /** Additional type-specific metadata */
  metadata?: TimelineEventMetadata
}

/**
 * Type-specific metadata for timeline events
 */
export interface TimelineEventMetadata {
  /** Status value for project/work_order events */
  status?: string

  /** Amount in CHF for cost events */
  amount?: number

  /** Condition value for condition change events */
  condition?: string

  /** Old condition for condition change events */
  old_condition?: string

  /** Media URL for media events */
  media_url?: string

  /** Room name for condition events */
  room_name?: string

  /** Project name for work_order/invoice events */
  project_name?: string

  /** Partner/contractor name for work_order events */
  partner_name?: string
}

// =============================================
// TIMELINE API TYPES
// =============================================

/**
 * Response from timeline fetch with pagination
 */
export interface TimelineResponse {
  events: TimelineEvent[]
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
    total?: number
  }
}

/**
 * Parameters for fetching timeline
 */
export interface TimelineParams {
  unitId: string
  limit?: number
  offset?: number
  eventTypes?: TimelineEventType[]
}
