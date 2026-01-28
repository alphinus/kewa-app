/**
 * Send Approval API
 *
 * POST: Creates magic link token for client change order approval
 * Phase: 21-change-orders, Plan: 04
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

interface SendApprovalBody {
  client_email: string
  client_name?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: SendApprovalBody = await request.json()
    const { client_email, client_name } = body

    // Validate email
    if (!client_email || !client_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Valid email address required' },
        { status: 400 }
      )
    }

    // Fetch change order
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .select('id, co_number, status')
      .eq('id', id)
      .single()

    if (coError || !changeOrder) {
      return NextResponse.json(
        { error: 'Change order not found' },
        { status: 404 }
      )
    }

    // Validate CO status (can send approval for under_review or approved status)
    if (!['under_review', 'approved'].includes(changeOrder.status)) {
      return NextResponse.json(
        {
          error: `Cannot send approval for change order with status: ${changeOrder.status}`,
        },
        { status: 400 }
      )
    }

    // Create magic link token via RPC
    const { data: token, error: tokenError } = await supabase.rpc(
      'create_magic_link_token',
      {
        p_email: client_email,
        p_purpose: 'change_order_approval',
        p_work_order_id: null,
        p_user_id: null,
        p_expires_hours: 168, // 7 days
        p_created_by: user.id,
      }
    )

    if (tokenError || !token) {
      console.error('Error creating magic link token:', tokenError)
      return NextResponse.json(
        { error: 'Failed to create approval token' },
        { status: 500 }
      )
    }

    // Link token to change order
    const { error: linkError } = await supabase
      .from('change_order_approval_tokens')
      .insert({
        token: token,
        change_order_id: id,
      })

    if (linkError) {
      console.error('Error linking token to change order:', linkError)
      return NextResponse.json(
        { error: 'Failed to link token to change order' },
        { status: 500 }
      )
    }

    // Calculate expiry
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 168)

    // Construct portal URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const portalUrl = `${baseUrl}/portal/change-orders/${token}`

    return NextResponse.json({
      token,
      portal_url: portalUrl,
      expires_at: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Error in send-approval endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
