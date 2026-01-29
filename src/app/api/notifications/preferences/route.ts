/**
 * Notification Preferences API
 *
 * GET: Retrieve user's notification preferences with available types
 * PUT: Update notification preferences
 * Phase: 24-push-notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getPreferences,
  upsertPreferences,
  getAvailableTypes,
} from '@/lib/notifications/preferences'
import type { UpdatePreferencesInput } from '@/types/notifications'

// =============================================
// GET - Retrieve preferences
// =============================================

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const userId = request.headers.get('x-user-id')
    const roleName = request.headers.get('x-user-role-name')

    if (!userId || !roleName) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get preferences (returns defaults if none exist)
    const preferences = await getPreferences(userId)

    // Get available types for user's role
    const availableTypes = getAvailableTypes(roleName)

    return NextResponse.json({
      preferences,
      availableTypes,
    })
  } catch (error) {
    console.error('GET /api/notifications/preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================
// PUT - Update preferences
// =============================================

export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const userId = request.headers.get('x-user-id')
    const roleName = request.headers.get('x-user-role-name')

    if (!userId || !roleName) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse body
    const body = await request.json() as UpdatePreferencesInput

    // Get available types for role-based validation
    const availableTypes = getAvailableTypes(roleName)

    // Validate: user can only enable types available for their role
    const invalidFields: string[] = []

    if (body.work_order_status_enabled && !availableTypes.includes('work_order_status')) {
      invalidFields.push('work_order_status_enabled')
    }
    if (body.approval_needed_enabled && !availableTypes.includes('approval_needed')) {
      invalidFields.push('approval_needed_enabled')
    }
    if (body.deadline_reminder_enabled && !availableTypes.includes('deadline_reminder')) {
      invalidFields.push('deadline_reminder_enabled')
    }

    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid preferences',
          message: `Cannot enable notification types not available for role: ${invalidFields.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Update preferences
    const preferences = await upsertPreferences(userId, body)

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('PUT /api/notifications/preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
