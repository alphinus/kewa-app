/**
 * Push Subscription API - Unsubscribe
 *
 * POST /api/push/unsubscribe - Remove push subscription
 *
 * Phase 24-01: Push Notifications Foundation
 */

import { NextRequest, NextResponse } from 'next/server'
import { removeSubscription } from '@/lib/notifications/queries'

/**
 * POST /api/push/unsubscribe - Remove push subscription
 *
 * Request body:
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
    const { deviceId } = body

    // Validate required fields
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing required field: deviceId' },
        { status: 400 }
      )
    }

    // Remove subscription from database
    await removeSubscription(userId, deviceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing push subscription:', error)
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    )
  }
}
