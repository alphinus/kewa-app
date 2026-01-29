import { NextRequest, NextResponse } from 'next/server'
import { markAllAsRead } from '@/lib/notifications/queries'

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the user
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await markAllAsRead(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
}
