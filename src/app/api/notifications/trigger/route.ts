/**
 * Notification Trigger API
 *
 * Internal API for triggering notifications from cron jobs or system events.
 * Phase: 24-push-notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  notifyDeadlineReminder,
  getUpcomingDeadlines,
} from '@/lib/notifications/triggers'

/**
 * POST /api/notifications/trigger
 *
 * Body: { type: 'deadline_reminder', workOrderId?, woNumber?, deadlineDate? }
 *
 * Security: Requires x-user-id header (authenticated) OR x-cron-secret header matching CRON_SECRET env var
 *
 * Two modes:
 * 1. Single reminder: { type: 'deadline_reminder', workOrderId, woNumber, deadlineDate }
 * 2. Batch mode: { type: 'deadline_reminder' } - queries for all upcoming deadlines and sends reminders
 */
export async function POST(request: NextRequest) {
  try {
    // Security check: authenticated user OR cron secret
    const userId = request.headers.get('x-user-id')
    const cronSecret = request.headers.get('x-cron-secret')

    const isAuthenticated = !!userId
    const isCronJob = cronSecret && cronSecret === process.env.CRON_SECRET

    if (!isAuthenticated && !isCronJob) {
      return NextResponse.json(
        { error: 'Unauthorized - requires authentication or valid cron secret' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate type
    if (!body.type) {
      return NextResponse.json(
        { error: 'Missing type field' },
        { status: 400 }
      )
    }

    // Handle deadline_reminder type
    if (body.type === 'deadline_reminder') {
      // Single work order mode
      if (body.workOrderId && body.woNumber && body.deadlineDate) {
        await notifyDeadlineReminder(
          body.workOrderId,
          body.woNumber,
          body.deadlineDate
        )

        return NextResponse.json({
          success: true,
          remindersSent: 1,
        })
      }

      // Batch mode: query for all upcoming deadlines
      const upcomingDeadlines = await getUpcomingDeadlines()

      // Send reminder for each
      for (const wo of upcomingDeadlines) {
        await notifyDeadlineReminder(wo.id, wo.wo_number, wo.acceptance_deadline)
      }

      return NextResponse.json({
        success: true,
        remindersSent: upcomingDeadlines.length,
      })
    }

    // Unknown type
    return NextResponse.json(
      { error: `Unknown trigger type: ${body.type}` },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in POST /api/notifications/trigger:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
