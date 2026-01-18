/**
 * Contractor Status Update API
 *
 * POST /api/contractor/[token]/status
 *
 * Updates work order status based on contractor actions.
 * Valid transitions:
 * - viewed -> accepted (with optional proposed_cost, contractor_notes)
 * - viewed -> rejected (with rejection_reason)
 * - accepted -> in_progress
 * - in_progress -> done
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateContractorAccess } from '@/lib/magic-link'
import { createClient } from '@/lib/supabase/server'

interface StatusUpdateRequest {
  workOrderId: string
  status: string
  proposed_cost?: number | null
  contractor_notes?: string | null
  rejection_reason?: string | null
}

// Valid status transitions for contractors
const VALID_TRANSITIONS: Record<string, string[]> = {
  sent: ['viewed'],
  viewed: ['accepted', 'rejected'],
  accepted: ['in_progress'],
  in_progress: ['done', 'blocked'],
  blocked: ['in_progress'],
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
    const body: StatusUpdateRequest = await request.json()
    const { workOrderId, status, proposed_cost, contractor_notes, rejection_reason } = body

    if (!workOrderId || !status) {
      return NextResponse.json(
        { error: 'workOrderId and status are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current work order - verify it belongs to this contractor
    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select(`
        id,
        status,
        partner:partners!inner(email)
      `)
      .eq('id', workOrderId)
      .ilike('partners.email', validation.email.toLowerCase())
      .single()

    if (fetchError || !workOrder) {
      return NextResponse.json(
        { error: 'Work order not found or access denied' },
        { status: 404 }
      )
    }

    // Check if transition is valid
    const currentStatus = workOrder.status as string
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || []

    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentStatus}' to '${status}'`,
          allowed: allowedTransitions,
        },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status,
    }

    // Add status-specific fields
    switch (status) {
      case 'viewed':
        updateData.viewed_at = new Date().toISOString()
        break

      case 'accepted':
        updateData.accepted_at = new Date().toISOString()
        if (proposed_cost !== undefined) {
          updateData.proposed_cost = proposed_cost
        }
        if (contractor_notes !== undefined) {
          updateData.contractor_notes = contractor_notes
        }
        break

      case 'rejected':
        updateData.rejected_at = new Date().toISOString()
        if (rejection_reason) {
          updateData.rejection_reason = rejection_reason
        }
        break

      case 'in_progress':
        updateData.actual_start_date = new Date().toISOString().split('T')[0]
        break

      case 'done':
        updateData.actual_end_date = new Date().toISOString().split('T')[0]
        break
    }

    // Update work order
    const { data: updated, error: updateError } = await supabase
      .from('work_orders')
      .update(updateData)
      .eq('id', workOrderId)
      .select('id, status')
      .single()

    if (updateError) {
      console.error('Failed to update work order status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      workOrder: updated,
    })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
