import { NextRequest, NextResponse } from 'next/server'
import { listUserNotifications } from '@/lib/notifications/queries'

/**
 * GET /api/notifications
 * List user notifications with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const type = searchParams.get('type') as any
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await listUserNotifications(userId, {
      unread_only: unreadOnly,
      type: type || undefined,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to list notifications:', error)
    return NextResponse.json(
      { error: 'Failed to list notifications' },
      { status: 500 }
    )
  }
}
