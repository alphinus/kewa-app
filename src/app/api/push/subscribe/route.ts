/**
 * Push Subscription API - Subscribe
 *
 * POST /api/push/subscribe - Save push subscription
 *
 * Phase 24-01: Push Notifications Foundation
 */

import { NextRequest, NextResponse } from 'next/server'
import { saveSubscription } from '@/lib/notifications/queries'
import type { SubscribePushInput } from '@/types/notifications'

/**
 * POST /api/push/subscribe - Save push subscription
 *
 * Request body:
 * - subscription: PushSubscriptionJSON
 * - deviceId: string
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from headers (set by middleware)
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { subscription, deviceId } = body as SubscribePushInput

    // Validate required fields
    if (!subscription || !deviceId) {
      return NextResponse.json(
        { error: 'Missing required fields: subscription and deviceId' },
        { status: 400 }
      )
    }

    // Save subscription to database
    await saveSubscription(userId, { subscription, deviceId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}
