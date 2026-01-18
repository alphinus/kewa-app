/**
 * Counter-Offer Response API (Admin)
 *
 * POST /api/work-orders/[id]/counter-offer
 *
 * KEWA admin endpoint to respond to contractor counter-offers.
 * Actions:
 * - approve: Accept counter-offer, set work order to 'accepted'
 * - reject: Reject counter-offer, send back to contractor for new response
 * - close: Close the work order entirely
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/session'

// ============================================
// TYPES
// ============================================

interface CounterOfferResponseRequest {
  action: 'approve' | 'reject' | 'close'
  notes?: string
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workOrderId } = await params

    // Check admin authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await validateSession(sessionCookie.value)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only kewa role can manage work orders (admin access)
    if (session.role !== 'kewa') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body: CounterOfferResponseRequest = await request.json()
    const { action, notes } = body

    // Validate action
    if (!action || !['approve', 'reject', 'close'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, or close' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current work order
    const { data: workOrder, error: fetchError } = await supabase
      .from('work_orders')
      .select('id, status, counter_offer_status')
      .eq('id', workOrderId)
      .single()

    if (fetchError || !workOrder) {
      return NextResponse.json(
        { error: 'Work order not found' },
        { status: 404 }
      )
    }

    // Verify work order has pending counter-offer
    if (workOrder.counter_offer_status !== 'pending') {
      return NextResponse.json(
        { error: 'No pending counter-offer to respond to' },
        { status: 400 }
      )
    }

    // Build update data based on action
    let updateData: Record<string, unknown> = {
      counter_offer_responded_at: new Date().toISOString(),
    }

    switch (action) {
      case 'approve':
        // Approve counter-offer: set work order to accepted
        updateData = {
          ...updateData,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          counter_offer_status: 'approved',
          counter_offer_response_notes: notes || null,
        }
        break

      case 'reject':
        // Reject counter-offer: keep viewed status, let contractor respond again
        updateData = {
          ...updateData,
          counter_offer_status: 'rejected',
          counter_offer_response_notes: notes || null,
          // Clear proposed values so contractor can submit new ones
          proposed_cost: null,
          proposed_start_date: null,
          proposed_end_date: null,
          contractor_notes: null,
        }
        break

      case 'close':
        // Close the work order entirely
        // First need to go through the state machine: viewed -> rejected -> draft
        // Then we mark it as closed administratively
        updateData = {
          ...updateData,
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: 'Auftrag von KEWA geschlossen: ' + (notes || 'Kein Grund angegeben'),
          counter_offer_status: 'rejected',
          counter_offer_response_notes: notes || null,
        }
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
        { error: 'Failed to process counter-offer response' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      action,
      workOrder: updated,
    })
  } catch (error) {
    console.error('Counter-offer response error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
