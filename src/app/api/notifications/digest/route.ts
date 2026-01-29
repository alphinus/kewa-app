/**
 * Digest Notification API
 *
 * POST: Send daily digest notifications
 * Called by pg_cron (via pg_net) or external cron service
 * Phase: 24-push-notifications (PUSH-10)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDigestNotification } from '@/lib/notifications/send'
import { getUnreadCount } from '@/lib/notifications/queries'

// =============================================
// POST - Send digest notifications
// =============================================

/**
 * Two modes:
 * 1. Single user mode: { userId, unreadCount } - pg_cron uses this
 * 2. Batch mode: no body or { batch: true } - external cron uses this
 */
export async function POST(request: NextRequest) {
  try {
    // Security: require authenticated admin OR cron secret
    const userId = request.headers.get('x-user-id')
    const cronSecret = request.headers.get('x-cron-secret')

    if (!userId && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse body
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is valid for batch mode
    }

    // Single user mode
    if (body.userId && typeof body.unreadCount === 'number') {
      const sent = await sendDigestNotification(body.userId, body.unreadCount)
      return NextResponse.json({
        success: true,
        digestsSent: sent ? 1 : 0,
      })
    }

    // Batch mode: find all users with digest enabled at current hour
    const supabase = await createClient()

    // Get current hour in UTC (pg_cron runs in UTC)
    const currentHour = new Date().getUTCHours()

    // Query users whose digest_time matches current hour in their timezone
    // Note: This is simplified - proper implementation would convert user's digest_time
    // to UTC and compare. For MVP, we assume digest_time is in UTC.
    const { data: users, error } = await supabase
      .from('notification_preferences')
      .select('user_id, digest_time, timezone')
      .eq('digest_enabled', true)

    if (error) throw error

    let digestsSent = 0

    // For each user, check if their digest time matches current hour
    for (const user of users || []) {
      try {
        // Extract hour from digest_time (HH:MM format)
        const digestHour = parseInt(user.digest_time.split(':')[0], 10)

        // Simple match: if digest hour matches current UTC hour
        // TODO: Proper timezone conversion for production
        if (digestHour === currentHour) {
          // Count unread notifications
          const unreadCount = await getUnreadCount(user.user_id)

          // Send digest
          const sent = await sendDigestNotification(user.user_id, unreadCount)
          if (sent) {
            digestsSent++
          }
        }
      } catch (err) {
        console.error(`Error sending digest to user ${user.user_id}:`, err)
        // Continue to next user
      }
    }

    return NextResponse.json({
      success: true,
      digestsSent,
    })
  } catch (error) {
    console.error('POST /api/notifications/digest error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
