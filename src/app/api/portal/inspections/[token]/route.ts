/**
 * Portal Inspection Data API
 *
 * GET: Validates token and returns inspection data for contractor portal
 * No authentication required - token-based access only.
 *
 * Phase: 23-inspection-advanced Plan 02
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateInspectionPortalToken } from '@/lib/inspections/portal-tokens'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const validation = await validateInspectionPortalToken(token)
    if (!validation.valid || !validation.inspectionId) {
      return NextResponse.json(
        { valid: false, error: 'Token ungültig oder abgelaufen' },
        { status: 200 }
      )
    }

    const supabase = await createClient()

    // Fetch inspection with defects (exclude internal fields like inspector_id, notes)
    const { data: inspection, error } = await supabase
      .from('inspections')
      .select(`
        id, title, description, inspection_date, status, overall_result,
        checklist_items, signer_name, signer_role, signed_at,
        signature_refused, signature_refused_reason,
        work_order:work_orders(id, title, wo_number),
        project:renovation_projects(id, name),
        defects:inspection_defects(id, title, description, severity, status, action)
      `)
      .eq('id', validation.inspectionId)
      .single()

    if (error || !inspection) {
      return NextResponse.json(
        { valid: false, error: 'Inspektion nicht gefunden' },
        { status: 200 }
      )
    }

    return NextResponse.json({
      valid: true,
      inspection,
      email: validation.email,
    })
  } catch (error) {
    console.error('Error in portal inspection data endpoint:', error)
    return NextResponse.json(
      { valid: false, error: 'Interner Fehler' },
      { status: 200 }
    )
  }
}
