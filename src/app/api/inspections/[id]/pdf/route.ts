/**
 * Inspection PDF Generation API Route
 *
 * GET: Generate and return PDF for inspection
 * Phase: 22-inspection-core Plan 03
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getCurrentUser } from '@/lib/auth/session'
import { getInspection } from '@/lib/inspections/queries'
import { getSignatureUrl } from '@/lib/inspections/signature-utils'
import { InspectionPDFDocument } from '@/components/inspections/InspectionPDF'
import type { InspectionPDFData } from '@/components/inspections/InspectionPDF'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const inspectionId = params.id

    // Fetch inspection with defects
    const inspection = await getInspection(inspectionId)

    // Get signature URL if signed
    let signatureUrl: string | undefined
    if (inspection.signature_storage_path) {
      try {
        signatureUrl = await getSignatureUrl(inspection.signature_storage_path)
      } catch (error) {
        console.error('Error getting signature URL:', error)
        // Continue without signature image
      }
    }

    // Prepare PDF data
    const pdfData: InspectionPDFData = {
      inspection,
      defects: inspection.defects || [],
      signatureUrl,
    }

    // Render PDF to buffer
    const buffer = await renderToBuffer(<InspectionPDFDocument data={pdfData} />)

    // Generate filename
    const date = new Date(inspection.inspection_date).toISOString().split('T')[0]
    const filename = `Abnahme-${inspection.title.replace(/[^a-zA-Z0-9]/g, '-')}-${date}.pdf`

    // Return PDF
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Erstellen des PDFs' },
      { status: 500 }
    )
  }
}
