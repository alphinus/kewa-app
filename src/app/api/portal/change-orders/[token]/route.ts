/**
 * Portal Change Order Data API
 *
 * GET: Validates token and returns change order data for client portal
 * Phase: 21-change-orders, Plan: 04
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/with-org'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createServiceClient()

    // Manual token validation (DO NOT consume token - read-only check)
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
        {
          valid: false,
          error:
            tokenError?.code === 'PGRST116'
              ? 'Token expired or invalid'
              : 'Token not found',
        },
        { status: 200 }
      )
    }

    // Verify this is a change_order_approval token
    if (tokenData.purpose !== 'change_order_approval') {
      return NextResponse.json(
        { valid: false, error: 'Invalid token purpose' },
        { status: 200 }
      )
    }

    // Lookup change order ID from approval tokens table
    const { data: approvalToken, error: approvalError } = await supabase
      .from('change_order_approval_tokens')
      .select('change_order_id')
      .eq('token', token)
      .single()

    if (approvalError || !approvalToken) {
      return NextResponse.json(
        { valid: false, error: 'Change order not found for token' },
        { status: 200 }
      )
    }

    // Fetch change order with work order join
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .select(
        `
        *,
        work_order:work_orders (
          id,
          title,
          wo_number
        )
      `
      )
      .eq('id', approvalToken.change_order_id)
      .single()

    if (coError || !changeOrder) {
      return NextResponse.json(
        { valid: false, error: 'Change order not found' },
        { status: 200 }
      )
    }

    // Respect show_line_items_to_client setting
    const showLineItems = changeOrder.show_line_items_to_client
    if (!showLineItems) {
      // Remove line items, keep only total
      changeOrder.line_items = []
    }

    return NextResponse.json({
      valid: true,
      change_order: changeOrder,
      show_line_items: showLineItems,
    })
  } catch (error) {
    console.error('Error in portal change order data endpoint:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 200 }
    )
  }
}
