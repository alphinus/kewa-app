/**
 * Portal Inspection Acknowledgment API
 *
 * POST: Contractor acknowledges receipt of inspection via magic link
 * Consumes token to prevent reuse.
 *
 * Phase: 23-inspection-advanced Plan 02
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  validateInspectionPortalToken,
  consumeInspectionPortalToken,
} from '@/lib/inspections/portal-tokens'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const validation = await validateInspectionPortalToken(token)
    if (!validation.valid || !validation.inspectionId) {
      return NextResponse.json(
        { error: 'Token ungültig oder abgelaufen' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Update inspection with acknowledgment timestamp
    const { error: updateError } = await supabase
      .from('inspections')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by_email: validation.email,
      })
      .eq('id', validation.inspectionId)

    if (updateError) {
      console.error('Error updating inspection acknowledgment:', updateError)
      return NextResponse.json(
        { error: 'Fehler beim Bestaetigen' },
        { status: 500 }
      )
    }

    // Consume token to prevent reuse
    await consumeInspectionPortalToken(token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in portal inspection acknowledge endpoint:', error)
    return NextResponse.json(
      { error: 'Interner Fehler' },
      { status: 500 }
    )
  }
}
