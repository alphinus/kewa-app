/**
 * Change Order PDF Generation API
 *
 * GET: Generate and download PDF document for a change order
 *
 * Phase 21-03: Photo Evidence and PDF Generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateChangeOrderPDF } from '@/lib/pdf/change-order-pdf'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/change-orders/[id]/pdf
 *
 * Generate PDF for change order and return as download
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    // Verify user authentication and role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'property_manager', 'renovation_manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch change order with work order join
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .select(
        `
        *,
        work_order:work_orders!work_order_id (
          wo_number,
          title
        )
      `
      )
      .eq('id', id)
      .single()

    if (coError || !changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    // Generate PDF
    const pdfBuffer = await generateChangeOrderPDF({
      co_number: changeOrder.co_number,
      description: changeOrder.description,
      reason_category: changeOrder.reason_category,
      schedule_impact_days: changeOrder.schedule_impact_days,
      status: changeOrder.status,
      line_items: changeOrder.line_items,
      total_amount: changeOrder.total_amount,
      created_at: changeOrder.created_at,
      work_order: changeOrder.work_order as { wo_number: string; title: string },
    })

    // Extract year and number from CO number for filename
    // Format: CO-YYYY-NNNNN
    const filename = `${changeOrder.co_number}.pdf`

    // Return PDF with download headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error in GET /api/change-orders/[id]/pdf:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
