/**
 * Contractor Response API
 *
 * POST /api/contractor/[token]/[workOrderId]/respond
 *
 * Handles contractor responses to work orders:
 * - accept: Accept the work order (optionally with proposed cost/dates)
 * - reject: Reject with required reason
 * - counter_offer: Submit counter-offer for KEWA review
 *
 * Requirements: EXT-07, EXT-08, EXT-09, EXT-10
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateContractorAccess } from '@/lib/magic-link'
import { createServiceClient } from '@/lib/supabase/with-org'
import { ResponseAction, getRejectionReasonById } from '@/lib/contractor/constants'
import {
  logAcceptedEvent,
  logRejectedEvent,
  logCounterOfferSubmittedEvent,
} from '@/lib/work-orders/events'

// ============================================
// TYPES
// ============================================

interface RespondRequest {
  action: ResponseAction
  // For accept/counter_offer
  proposed_cost?: number | null
  proposed_start_date?: string | null
  proposed_end_date?: string | null
  contractor_notes?: string | null
  // For reject
  rejection_reason?: string | null
}

interface WorkOrderData {
  id: string
  status: string
  estimated_cost: number | null
  requested_start_date: string | null
  requested_end_date: string | null
  partner: { email: string | null } | null
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; workOrderId: string }> }
) {
  try {
    const { token, workOrderId } = await params

    // Validate contractor access
    const validation = await validateContractorAccess(token)
    if (!validation.valid || !validation.email) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: RespondRequest = await request.json()
    const {
      action,
      proposed_cost,
      proposed_start_date,
      proposed_end_date,
      contractor_notes,
      rejection_reason,
    } = body

    // Validate action
    if (!action || !['accept', 'reject', 'counter_offer'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: accept, reject, or counter_offer' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get current work order - verify ownership by contractor email
    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select(`
        id,
        status,
        estimated_cost,
        requested_start_date,
        requested_end_date,
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

    const wo = workOrder as unknown as WorkOrderData

    // Verify work order is in 'viewed' status (can respond)
    if (wo.status !== 'viewed') {
      return NextResponse.json(
        {
          error: `Cannot respond to work order in '${wo.status}' status`,
          current_status: wo.status,
        },
        { status: 400 }
      )
    }

    // Handle based on action
    let updateData: Record<string, unknown> = {}

    switch (action) {
      case 'accept':
        updateData = handleAccept(wo, {
          proposed_cost,
          proposed_start_date,
          proposed_end_date,
          contractor_notes,
        })
        break

      case 'reject':
        if (!rejection_reason) {
          return NextResponse.json(
            { error: 'Rejection reason is required' },
            { status: 400 }
          )
        }
        updateData = handleReject(rejection_reason)
        break

      case 'counter_offer':
        // Validate that counter-offer has at least one change
        const hasChange =
          (proposed_cost !== undefined && proposed_cost !== wo.estimated_cost) ||
          (proposed_start_date && proposed_start_date !== wo.requested_start_date) ||
          (proposed_end_date && proposed_end_date !== wo.requested_end_date)

        if (!hasChange) {
          return NextResponse.json(
            { error: 'Counter-offer must include at least one change (cost or dates)' },
            { status: 400 }
          )
        }

        updateData = handleCounterOffer({
          proposed_cost,
          proposed_start_date,
          proposed_end_date,
          contractor_notes,
        })
        break
    }

    // Update work order
    const { data: updated, error: updateError } = await supabase
      .from('work_orders')
      .update(updateData)
      .eq('id', workOrderId)
      .select('id, status, counter_offer_status')
      .single()

    if (updateError) {
      console.error('Failed to update work order:', updateError)
      return NextResponse.json(
        { error: 'Failed to process response' },
        { status: 500 }
      )
    }

    // Log event based on action
    switch (action) {
      case 'accept':
        await logAcceptedEvent(workOrderId, validation.email, {
          proposed_cost,
          proposed_start_date,
          proposed_end_date,
        })
        break
      case 'reject':
        await logRejectedEvent(workOrderId, validation.email, rejection_reason || 'Unbekannt')
        break
      case 'counter_offer':
        await logCounterOfferSubmittedEvent(workOrderId, validation.email, {
          proposed_cost,
          proposed_start_date,
          proposed_end_date,
          notes: contractor_notes,
        })
        break
    }

    return NextResponse.json({
      success: true,
      action,
      workOrder: updated,
    })
  } catch (error) {
    console.error('Response processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// ACTION HANDLERS
// ============================================

/**
 * Handle accept action.
 * If proposed values match estimated/requested, direct accept.
 * Otherwise, sets proposed values for record keeping.
 */
function handleAccept(
  workOrder: WorkOrderData,
  data: {
    proposed_cost?: number | null
    proposed_start_date?: string | null
    proposed_end_date?: string | null
    contractor_notes?: string | null
  }
): Record<string, unknown> {
  const update: Record<string, unknown> = {
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  }

  // Set proposed values if provided
  if (data.proposed_cost !== undefined) {
    update.proposed_cost = data.proposed_cost
  }
  if (data.proposed_start_date !== undefined) {
    update.proposed_start_date = data.proposed_start_date
  }
  if (data.proposed_end_date !== undefined) {
    update.proposed_end_date = data.proposed_end_date
  }
  if (data.contractor_notes) {
    update.contractor_notes = data.contractor_notes
  }

  // Clear any previous counter-offer state
  update.counter_offer_status = null
  update.counter_offer_responded_at = null
  update.counter_offer_response_notes = null

  return update
}

/**
 * Handle reject action.
 * Sets status to rejected with reason.
 */
function handleReject(rejectionReason: string): Record<string, unknown> {
  // Try to get standard reason description, or use custom text
  const standardReason = getRejectionReasonById(rejectionReason)
  const reasonText = standardReason ? standardReason.description : rejectionReason

  return {
    status: 'rejected',
    rejected_at: new Date().toISOString(),
    rejection_reason: reasonText,
    // Clear counter-offer state
    counter_offer_status: null,
    counter_offer_responded_at: null,
    counter_offer_response_notes: null,
  }
}

/**
 * Handle counter-offer action.
 * Keeps status as 'viewed' but sets counter_offer_status to 'pending'.
 * KEWA will review and approve/reject.
 */
function handleCounterOffer(data: {
  proposed_cost?: number | null
  proposed_start_date?: string | null
  proposed_end_date?: string | null
  contractor_notes?: string | null
}): Record<string, unknown> {
  const update: Record<string, unknown> = {
    // Status stays 'viewed' - KEWA needs to review
    counter_offer_status: 'pending',
  }

  // Set proposed values
  if (data.proposed_cost !== undefined) {
    update.proposed_cost = data.proposed_cost
  }
  if (data.proposed_start_date !== undefined) {
    update.proposed_start_date = data.proposed_start_date
  }
  if (data.proposed_end_date !== undefined) {
    update.proposed_end_date = data.proposed_end_date
  }
  if (data.contractor_notes) {
    update.contractor_notes = data.contractor_notes
  }

  // Clear previous response timestamps
  update.counter_offer_responded_at = null
  update.counter_offer_response_notes = null

  return update
}
