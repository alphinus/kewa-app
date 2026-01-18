/**
 * Mark Work Orders as Viewed API
 *
 * POST /api/contractor/[token]/mark-viewed
 *
 * Called when contractor opens dashboard to mark 'sent' work orders as 'viewed'.
 * Updates status and viewed_at timestamp.
 *
 * Implements EXT-13: Tracking - Viewed status set when magic link opened
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateContractorAccess } from '@/lib/magic-link'
import { createClient } from '@/lib/supabase/server'

interface RequestBody {
  workOrderIds: string[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate contractor access
    const validation = await validateContractorAccess(token)
    if (!validation.valid || !validation.email) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: RequestBody = await request.json()
    const { workOrderIds } = body

    if (!workOrderIds || !Array.isArray(workOrderIds) || workOrderIds.length === 0) {
      return NextResponse.json(
        { error: 'workOrderIds array is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update work orders to 'viewed' status
    // Only update if current status is 'sent' (security check)
    const { data: updated, error } = await supabase
      .from('work_orders')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .in('id', workOrderIds)
      .eq('status', 'sent')
      .select('id')

    if (error) {
      console.error('Failed to mark work orders as viewed:', error)
      return NextResponse.json(
        { error: 'Failed to update work orders' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updatedCount: updated?.length || 0,
      updatedIds: updated?.map((wo) => wo.id) || [],
    })
  } catch (error) {
    console.error('Mark viewed error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
