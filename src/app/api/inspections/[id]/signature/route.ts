/**
 * Inspection Signature API Route
 *
 * POST: Save signature or record refusal
 * Phase: 22-inspection-core Plan 03
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { getInspection, updateInspection } from '@/lib/inspections/queries'
import { uploadSignature, getSignatureUrl } from '@/lib/inspections/signature-utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: inspectionId } = await params
    const body = await req.json()

    // Fetch inspection
    const inspection = await getInspection(inspectionId)

    // Validate inspection status
    if (inspection.status !== 'completed') {
      return NextResponse.json(
        { error: 'Unterschrift kann nur bei abgeschlossenen Abnahmen erfasst werden' },
        { status: 400 }
      )
    }

    // Handle signature refusal
    if (body.refused === true) {
      if (!body.refused_reason || body.refused_reason.trim() === '') {
        return NextResponse.json(
          { error: 'Grund für Verweigerung ist erforderlich' },
          { status: 400 }
        )
      }

      const updatedInspection = await updateInspection(inspectionId, {
        signature_refused: true,
        signature_refused_reason: body.refused_reason,
        // Status stays at 'completed' (not signed)
      })

      return NextResponse.json({ inspection: updatedInspection })
    }

    // Handle signature capture
    const { image_data_url, signer_name, signer_role } = body

    if (!image_data_url || !signer_name) {
      return NextResponse.json(
        { error: 'image_data_url und signer_name sind erforderlich' },
        { status: 400 }
      )
    }

    // Get org ID from middleware-injected header (required for org-prefixed storage path)
    const orgId = req.headers.get('x-organization-id')
    if (!orgId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }

    // Upload signature to storage
    const storagePath = await uploadSignature(orgId, inspectionId, image_data_url)

    // Update inspection
    const updatedInspection = await updateInspection(inspectionId, {
      signature_storage_path: storagePath,
      signer_name: signer_name,
      signer_role: signer_role || 'Handwerker',
      status: 'signed',
    })

    // Get signed URL for immediate display
    const signatureUrl = await getSignatureUrl(storagePath)

    return NextResponse.json({
      inspection: updatedInspection,
      signature_url: signatureUrl,
    })
  } catch (error) {
    console.error('Error saving signature:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Speichern der Unterschrift' },
      { status: 500 }
    )
  }
}
