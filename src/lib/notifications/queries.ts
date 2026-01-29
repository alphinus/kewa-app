/**
 * Notification Database Queries
 *
 * Query functions for notifications, user_notifications, and push_subscriptions.
 * Phase: 24-push-notifications
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Notification,
  UserNotification,
  NotificationType,
  CreateNotificationInput,
  SubscribePushInput,
  PushSubscriptionRecord,
} from '@/types/notifications'

// =============================================
// NOTIFICATION QUERIES
// =============================================

/**
 * List user notifications with filters
 */
export async function listUserNotifications(
  userId: string,
  filters?: {
    unread_only?: boolean
    type?: NotificationType
    limit?: number
    offset?: number
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('user_notifications')
    .select(
      `
      id,
      user_id,
      notification_id,
      read_at,
      created_at,
      notification:notifications(
        id,
        type,
        title,
        body,
        entity_type,
        entity_id,
        actor_id,
        urgency,
        url,
        created_at
      )
    `,
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.unread_only) {
    query = query.is('read_at', null)
  }

  if (filters?.type) {
    query = query.eq('notification.type', filters.type)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error, count } = await query

  if (error) throw error

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  // Transform joined data to match UserNotification type
  const notifications = (data || []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    notification_id: item.notification_id,
    read_at: item.read_at,
    created_at: item.created_at,
    notification: Array.isArray(item.notification) ? item.notification[0] : item.notification,
  }))

  return {
    notifications: notifications as UserNotification[],
    total: count || 0,
    unread_count: unreadCount || 0,
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw error

  return count || 0
}

/**
 * Mark a notification as read
 */
export async function markAsRead(userId: string, notificationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('notification_id', notificationId)

  if (error) throw error
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw error
}

/**
 * Create a notification
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      type: input.type,
      title: input.title,
      body: input.body,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      actor_id: input.actor_id || null,
      urgency: input.urgency || 'normal',
      url: input.url,
    })
    .select()
    .single()

  if (error) throw error

  return data as Notification
}

/**
 * Create a user notification record
 */
export async function createUserNotification(userId: string, notificationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      notification_id: notificationId,
    })
    .select()
    .single()

  if (error) throw error

  return data
}

/**
 * Create a notification and deliver to multiple users
 * Uses transaction pattern: insert notification, then batch insert user_notifications
 */
export async function createNotificationForUsers(
  input: CreateNotificationInput,
  userIds: string[]
) {
  const supabase = await createClient()

  // Create the notification
  const notification = await createNotification(input)

  // Create user_notification records for each user
  const userNotifications = userIds.map((userId) => ({
    user_id: userId,
    notification_id: notification.id,
  }))

  const { error } = await supabase
    .from('user_notifications')
    .insert(userNotifications)

  if (error) throw error

  return notification
}

// =============================================
// PUSH SUBSCRIPTION QUERIES
// =============================================

/**
 * Save or update a push subscription (upsert)
 */
export async function saveSubscription(userId: string, input: SubscribePushInput) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        device_id: input.deviceId,
        subscription_data: input.subscription as any,
        last_used_at: new Date().toISOString(),
        enabled: true,
      },
      {
        onConflict: 'user_id,device_id',
      }
    )

  if (error) throw error
}

/**
 * Remove a push subscription by device ID
 */
export async function removeSubscription(userId: string, deviceId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('device_id', deviceId)

  if (error) throw error
}

/**
 * Remove a push subscription by endpoint (for handling 410 Gone responses)
 */
export async function removeSubscriptionByEndpoint(endpoint: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('subscription_data->endpoint', endpoint)

  if (error) throw error
}

/**
 * Get all enabled push subscriptions for a user
 */
export async function getUserSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)

  if (error) throw error

  return (data || []) as PushSubscriptionRecord[]
}
