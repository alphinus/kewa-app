/**
 * Portal Approve Change Order API
 *
 * POST: Client approves change order via magic link
 * Phase: 21-change-orders, Plan: 04
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ApproveBody {
  comment?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()
    const body: ApproveBody = await request.json()

    // Validate token (same check as GET)
    const { data: tokenData, error: tokenError } = await supabase
      .from('magic_link_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .eq('is_revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Token expired or invalid' },
        { status: 400 }
      )
    }

    // Lookup change order
    const { data: approvalToken, error: approvalError } = await supabase
      .from('change_order_approval_tokens')
      .select('change_order_id')
      .eq('token', token)
      .single()

    if (approvalError || !approvalToken) {
      return NextResponse.json(
        { error: 'Change order not found for token' },
        { status: 404 }
      )
    }

    // Fetch current change order status
    const { data: changeOrder, error: coFetchError } = await supabase
      .from('change_orders')
      .select('id, status, co_number')
      .eq('id', approvalToken.change_order_id)
      .single()

    if (coFetchError || !changeOrder) {
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      )
    }

    // Check if already processed
    if (changeOrder.status !== 'under_review') {
      return NextResponse.json(
        { error: 'Change order already processed' },
        { status: 400 }
      )
    }

    // Mark token as used
    const { error: tokenUpdateError } = await supabase
      .from('magic_link_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    if (tokenUpdateError) {
      console.error('Error marking token as used:', tokenUpdateError)
      return NextResponse.json(
        { error: 'Failed to consume token' },
        { status: 500 }
      )
    }

    // Update change order to approved
    const { error: updateError } = await supabase
      .from('change_orders')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', approvalToken.change_order_id)

    if (updateError) {
      console.error('Error updating change order:', updateError)
      return NextResponse.json(
        { error: 'Failed to approve change order' },
        { status: 500 }
      )
    }

    // Log approval in audit trail (if comment provided)
    if (body.comment) {
      await supabase.rpc('create_audit_log', {
        p_table_name: 'change_orders',
        p_record_id: approvalToken.change_order_id,
        p_action: 'update',
        p_user_id: null, // Client approval (no user ID)
        p_ip_address: request.headers.get('x-forwarded-for') || null,
        p_old_values: { status: 'under_review' },
        p_new_values: {
          status: 'approved',
          comment: body.comment,
          approved_via: 'client_portal',
        },
      })
    }

    return NextResponse.json({
      success: true,
      status: 'approved',
    })
  } catch (error) {
    console.error('Error in approve endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
