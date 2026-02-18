/**
 * Defect Photos API
 *
 * GET /api/inspections/[id]/defects/[defectId]/photos - List photos for defect
 * POST /api/inspections/[id]/defects/[defectId]/photos - Upload photo for defect
 *
 * Phase 22-02: Inspection UI
 */

import { NextRequest, NextResponse } from 'next/server'
import { createOrgClient, OrgContextMissingError } from '@/lib/supabase/with-org'
import { inspectionDefectPhotoPath } from '@/lib/storage/paths'
import type { Role } from '@/types'

const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/inspections/[id]/defects/[defectId]/photos - List photos for defect
 *
 * Returns signed URLs for each path in defect.photo_storage_paths
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; defectId: string }> }
) {
  try {
    const { id, defectId } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const supabase = await createOrgClient(request)

    // Check inspections bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find(b => b.name === 'inspections')) {
      return NextResponse.json(
        { error: 'Inspections storage bucket not configured' },
        { status: 500 }
      )
    }

    // Fetch defect
    const { data: defect, error: defectError } = await supabase
      .from('inspection_defects')
      .select('id, inspection_id, photo_storage_paths')
      .eq('id', defectId)
      .single()

    if (defectError || !defect) {
      return NextResponse.json(
        { error: 'Defect not found' },
        { status: 404 }
      )
    }

    if (defect.inspection_id !== id) {
      return NextResponse.json(
        { error: 'Defect does not belong to this inspection' },
        { status: 400 }
      )
    }

    // Generate signed URLs for each photo
    const photos: { url: string; path: string }[] = []
    const photoPaths = defect.photo_storage_paths || []

    for (const path of photoPaths) {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('inspections')
        .createSignedUrl(path, 3600) // 1 hour expiry

      if (!urlError && urlData) {
        photos.push({
          url: urlData.signedUrl,
          path,
        })
      }
    }

    return NextResponse.json({ photos })
  } catch (error) {
    console.error('Error in GET /api/inspections/[id]/defects/[defectId]/photos:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inspections/[id]/defects/[defectId]/photos - Upload photo for defect
 *
 * FormData:
 * - file: image file
 *
 * Uploads to inspections/{inspectionId}/defects/{uuid}.webp
 * Appends path to defect.photo_storage_paths array
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; defectId: string }> }
) {
  try {
    const { id, defectId } = await params

    // Get user info from headers (set by middleware)
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role') as Role | null

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const orgId = request.headers.get('x-organization-id')
    if (!orgId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }

    const supabase = await createOrgClient(request)

    // Check inspections bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find(b => b.name === 'inspections')) {
      return NextResponse.json(
        { error: 'Inspections storage bucket not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file' },
        { status: 400 }
      )
    }

    // Fetch defect
    const { data: defect, error: defectError } = await supabase
      .from('inspection_defects')
      .select('id, inspection_id, photo_storage_paths')
      .eq('id', defectId)
      .single()

    if (defectError || !defect) {
      return NextResponse.json(
        { error: 'Defect not found' },
        { status: 404 }
      )
    }

    if (defect.inspection_id !== id) {
      return NextResponse.json(
        { error: 'Defect does not belong to this inspection' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const uuid = crypto.randomUUID()
    const storagePath = inspectionDefectPhotoPath(orgId, id, uuid)

    // Upload file to storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('inspections')
      .upload(storagePath, buffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload photo: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Append path to defect.photo_storage_paths array
    const photoPaths = defect.photo_storage_paths || []
    photoPaths.push(storagePath)

    const { error: updateError } = await supabase
      .from('inspection_defects')
      .update({ photo_storage_paths: photoPaths })
      .eq('id', defectId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: `Failed to update defect: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Generate signed URL for response
    const { data: urlData, error: urlError } = await supabase.storage
      .from('inspections')
      .createSignedUrl(storagePath, 3600)

    if (urlError) {
      console.error('Signed URL error:', urlError)
    }

    return NextResponse.json({
      photo: {
        path: storagePath,
        url: urlData?.signedUrl || null,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/inspections/[id]/defects/[defectId]/photos:', error)
    if (error instanceof OrgContextMissingError) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
