/**
 * Send Notification Functions
 *
 * Core notification dispatch with push delivery, quiet hours, urgency bypass, and digest mode.
 * Phase: 24-push-notifications
 */

import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'
import {
  createNotificationForUsers,
  getUserSubscriptions,
  removeSubscriptionByEndpoint,
} from '@/lib/notifications/queries'
import {
  getPreferences,
  isTypeEnabledForUser,
  isWithinQuietHours,
} from '@/lib/notifications/preferences'
import type {
  SendNotificationInput,
  CreateNotificationInput,
} from '@/types/notifications'

// =============================================
// SETUP
// =============================================

let vapidConfigured = false

function ensureVapidConfigured() {
  if (vapidConfigured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.')
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@kewa.app',
    publicKey,
    privateKey
  )
  vapidConfigured = true
}

// =============================================
// SEND NOTIFICATION
// =============================================

/**
 * Send notification to target users
 *
 * Steps:
 * 1. Create notification and user_notification records in database
 * 2. For each user, check preferences and send push if applicable
 * 3. Respect quiet hours (urgent bypasses)
 * 4. Respect digest mode (urgent bypasses)
 * 5. Respect type enabled/disabled preference
 *
 * Returns notification ID and count of users who received push
 */
export async function sendNotification(
  input: SendNotificationInput
): Promise<{ notificationId: string; deliveredTo: number }> {
  // Create notification + user_notifications in database
  const notification = await createNotificationForUsers(input, input.targetUserIds)

  let deliveredCount = 0

  // Send push to each target user (respecting preferences)
  for (const userId of input.targetUserIds) {
    try {
      // Get user preferences
      const prefs = await getPreferences(userId)

      // Check if type is enabled for user
      if (!isTypeEnabledForUser(prefs, input.type)) {
        continue // Skip: user disabled this notification type
      }

      // Check digest mode: if enabled and not urgent, skip push (notification stored in DB for digest)
      if (prefs.digest_enabled && input.urgency !== 'urgent') {
        continue // Skip: user has digest enabled, notification will be summarized later
      }

      // Check quiet hours: if within quiet hours and not urgent, skip push
      if (isWithinQuietHours(prefs) && input.urgency !== 'urgent') {
        continue // Skip: quiet hours active, notification stored in DB for later viewing
      }

      // All checks passed: send push to user's devices
      const sent = await sendPushToUser(userId, {
        title: input.title,
        body: input.body,
        url: input.url,
        urgency: input.urgency || 'normal',
        tag: `${input.entity_type}-${input.entity_id}`,
        notificationId: notification.id,
      })

      if (sent) {
        deliveredCount++
      }
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error)
      // Continue to next user on error
    }
  }

  return {
    notificationId: notification.id,
    deliveredTo: deliveredCount,
  }
}

/**
 * Send notification to all users with a specific role
 */
export async function sendNotificationToRole(
  input: CreateNotificationInput,
  roleName: string
): Promise<{ notificationId: string; deliveredTo: number }> {
  const supabase = await createClient()

  // Get all users with this role
  const { data: users, error } = await supabase
    .from('user_roles')
    .select('user_id, roles!inner(name)')
    .eq('roles.name', roleName)

  if (error) throw error

  const userIds = users?.map((u) => u.user_id) || []

  if (userIds.length === 0) {
    throw new Error(`No users found with role: ${roleName}`)
  }

  return sendNotification({
    ...input,
    targetUserIds: userIds,
  })
}

// =============================================
// PUSH DELIVERY
// =============================================

interface PushPayload {
  title: string
  body: string
  url: string
  urgency: string
  tag: string
  notificationId: string
}

/**
 * Send push notification to all of a user's subscribed devices
 */
async function sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
  try {
    ensureVapidConfigured()

    // Get user's push subscriptions
    const subscriptions = await getUserSubscriptions(userId)

    if (subscriptions.length === 0) {
      return false // No devices subscribed
    }

    // Build payload
    const pushPayload = JSON.stringify(payload)

    // Send to all devices
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription_data as any, pushPayload, {
            urgency: payload.urgency === 'urgent' ? 'high' : 'normal',
            TTL: 86400, // 24 hours
          })
        } catch (err: any) {
          // Handle 410 Gone (subscription expired)
          if (err.statusCode === 410) {
            await removeSubscriptionByEndpoint(sub.subscription_data.endpoint)
          }
          throw err
        }
      })
    )

    // Return true if at least one device received push
    const successCount = results.filter((r) => r.status === 'fulfilled').length
    return successCount > 0
  } catch (error) {
    console.error('Error sending push to user:', error)
    return false
  }
}

// =============================================
// DIGEST NOTIFICATION (PUSH-10)
// =============================================

/**
 * Send daily digest notification to a user
 *
 * Sends a single summary push: "Sie haben X ungelesene Benachrichtigungen"
 * Called by digest API endpoint (which is triggered by pg_cron or external cron)
 *
 * Skips if unreadCount is 0.
 */
export async function sendDigestNotification(
  userId: string,
  unreadCount: number
): Promise<boolean> {
  // Skip if no unread notifications
  if (unreadCount === 0) {
    return false
  }

  try {
    // Get user's push subscriptions
    const subscriptions = await getUserSubscriptions(userId)

    if (subscriptions.length === 0) {
      return false // No devices subscribed
    }

    ensureVapidConfigured()

    // Build digest payload
    const payload = JSON.stringify({
      title: 'Tägliche Zusammenfassung',
      body: `Sie haben ${unreadCount} ungelesene Benachrichtigungen`,
      url: '/dashboard/benachrichtigungen',
      urgency: 'info',
      tag: 'daily-digest',
      notificationId: '', // No specific notification ID for digest
    })

    // Send to all devices
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription_data as any, payload, {
            urgency: 'normal',
            TTL: 86400, // 24 hours
          })
        } catch (err: any) {
          // Handle 410 Gone (subscription expired)
          if (err.statusCode === 410) {
            await removeSubscriptionByEndpoint(sub.subscription_data.endpoint)
          }
          throw err
        }
      })
    )

    // Return true if at least one device received push
    const successCount = results.filter((r) => r.status === 'fulfilled').length
    return successCount > 0
  } catch (error) {
    console.error('Error sending digest notification:', error)
    return false
  }
}
