/**
 * Inspection PDF Generation API Route
 *
 * GET: Generate and return PDF for inspection
 * Uses base64-embedded signature to prevent URL expiry issues in saved PDFs.
 *
 * Phase: 22-inspection-core Plan 03
 * Updated: 23-inspection-advanced Plan 02 (base64 signature embedding)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { renderToBuffer } from '@react-pdf/renderer'
import { SESSION_COOKIE_NAME, validateSession } from '@/lib/session'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import { getInspection } from '@/lib/inspections/queries'
import { InspectionPDFDocument } from '@/components/inspections/InspectionPDF'
import type { InspectionPDFData } from '@/components/inspections/InspectionPDF'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const session = await validateSession(sessionCookie.value)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: inspectionId } = await params

    // Fetch inspection with defects
    const inspection = await getInspection(inspectionId)

    // Get signature as data URL for embedding (prevents URL expiry in PDF)
    let signatureDataUrl: string | undefined
    if (inspection.signature_storage_path) {
      try {
        const supabase = await createOrgClient(req)
        const { data: signatureBlob } = await supabase.storage
          .from('inspections')
          .download(inspection.signature_storage_path)

        if (signatureBlob) {
          const arrayBuffer = await signatureBlob.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          signatureDataUrl = `data:image/png;base64,${base64}`
        }
      } catch (error) {
        console.error('Error getting signature for PDF:', error)
        // Continue without signature image
      }
    }

    // Prepare PDF data
    const pdfData: InspectionPDFData = {
      inspection,
      defects: inspection.defects || [],
      signatureUrl: signatureDataUrl,
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
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Erstellen des PDFs' },
      { status: 500 }
    )
  }
}
