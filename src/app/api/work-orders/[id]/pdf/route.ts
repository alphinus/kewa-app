/**
 * Work Order PDF API
 *
 * GET /api/work-orders/[id]/pdf - Generate and download PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'
import { generateWorkOrderPDF } from '@/lib/pdf/work-order-pdf'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Type for the raw Supabase response
interface WorkOrderQueryResult {
  id: string
  title: string
  description: string | null
  scope_of_work: string | null
  requested_start_date: string | null
  requested_end_date: string | null
  acceptance_deadline: string | null
  estimated_cost: number | null
  room: Array<{
    id: string
    name: string
    room_type: string
    unit: Array<{
      id: string
      name: string
      building: Array<{
        id: string
        name: string
        address: string
      }> | null
    }> | null
  }> | null
  partner: Array<{
    id: string
    company_name: string
    contact_name: string | null
    email: string
  }> | null
}

// Helper to safely extract first element from Supabase array relation
function first<T>(arr: T[] | null | undefined): T | null {
  return arr && arr.length > 0 ? arr[0] : null
}

/**
 * GET /api/work-orders/[id]/pdf - Generate PDF for work order
 *
 * Returns PDF binary with appropriate headers for download.
 * Only KEWA/admin users can download PDFs.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await context.params

    // Validate UUID format
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid work order ID format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch work order with relations needed for PDF
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        title,
        description,
        scope_of_work,
        requested_start_date,
        requested_end_date,
        acceptance_deadline,
        estimated_cost,
        room:rooms (
          id,
          name,
          room_type,
          unit:units (
            id,
            name,
            building:buildings (
              id,
              name,
              address
            )
          )
        ),
        partner:partners (
          id,
          company_name,
          contact_name,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Work order not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching work order:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Cast to our expected type (Supabase returns arrays for relations)
    const workOrder = data as unknown as WorkOrderQueryResult

    // Extract first elements from Supabase array relations
    const roomData = first(workOrder.room)
    const unitData = roomData ? first(roomData.unit) : null
    const buildingData = unitData ? first(unitData.building) : null
    const partnerData = first(workOrder.partner)

    // Build the normalized work order data for PDF generation
    const workOrderData = {
      id: workOrder.id,
      title: workOrder.title,
      description: workOrder.description,
      scope_of_work: workOrder.scope_of_work,
      requested_start_date: workOrder.requested_start_date,
      requested_end_date: workOrder.requested_end_date,
      acceptance_deadline: workOrder.acceptance_deadline,
      estimated_cost: workOrder.estimated_cost,
      room: roomData ? {
        id: roomData.id,
        name: roomData.name,
        room_type: roomData.room_type,
        unit: unitData ? {
          id: unitData.id,
          name: unitData.name,
          building: buildingData ? {
            id: buildingData.id,
            name: buildingData.name,
            address: buildingData.address
          } : undefined
        } : undefined
      } : undefined,
      partner: partnerData ? {
        id: partnerData.id,
        company_name: partnerData.company_name,
        contact_name: partnerData.contact_name,
        email: partnerData.email
      } : undefined
    }

    // Generate PDF
    const pdfBuffer = await generateWorkOrderPDF(workOrderData)

    // Generate filename
    const shortId = id.slice(0, 8).toUpperCase()
    const filename = `arbeitsauftrag-${shortId}.pdf`

    // Return PDF with download headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/work-orders/[id]/pdf:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
