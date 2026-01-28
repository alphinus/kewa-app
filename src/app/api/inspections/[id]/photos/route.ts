/**
 * Inspection Photos API - Checklist Item Photos
 *
 * GET /api/inspections/[id]/photos - List photos for checklist items
 * POST /api/inspections/[id]/photos - Upload photo for checklist item
 *
 * Phase 22-02: Inspection UI
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/types'

const ALLOWED_ROLES: Role[] = ['kewa', 'imeri']

/**
 * GET /api/inspections/[id]/photos - List photos for checklist items
 *
 * Query params:
 * - item_id?: string (optional filter for specific item)
 *
 * Returns signed URLs for all checklist item photos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    const supabase = await createClient()

    // Check inspections bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find(b => b.name === 'inspections')) {
      return NextResponse.json(
        { error: 'Inspections storage bucket not configured' },
        { status: 500 }
      )
    }

    // Fetch inspection to get checklist_items
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select('id, checklist_items')
      .eq('id', id)
      .single()

    if (inspectionError || !inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const itemIdFilter = searchParams.get('item_id')

    // Extract photos from checklist_items JSONB
    const photos: { item_id: string; url: string; path: string }[] = []
    const checklistItems = inspection.checklist_items as any[] || []

    for (const section of checklistItems) {
      for (const item of section.items || []) {
        // Filter by item_id if provided
        if (itemIdFilter && item.item_id !== itemIdFilter) {
          continue
        }

        const photoPaths = item.photo_storage_paths || []
        for (const path of photoPaths) {
          // Generate signed URL
          const { data: urlData, error: urlError } = await supabase.storage
            .from('inspections')
            .createSignedUrl(path, 3600) // 1 hour expiry

          if (!urlError && urlData) {
            photos.push({
              item_id: item.item_id,
              url: urlData.signedUrl,
              path,
            })
          }
        }
      }
    }

    return NextResponse.json({ photos })
  } catch (error) {
    console.error('Error in GET /api/inspections/[id]/photos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inspections/[id]/photos - Upload photo for checklist item
 *
 * FormData:
 * - file: image file
 * - item_id: string (checklist item ID)
 *
 * Uploads to inspections/{inspectionId}/items/{uuid}.webp
 * Updates checklist_items JSONB to append path to item's photo_storage_paths
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    const supabase = await createClient()

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
    const itemId = formData.get('item_id') as string

    if (!file || !itemId) {
      return NextResponse.json(
        { error: 'Missing file or item_id' },
        { status: 400 }
      )
    }

    // Fetch inspection
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select('id, checklist_items')
      .eq('id', id)
      .single()

    if (inspectionError || !inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    // Generate unique filename
    const uuid = crypto.randomUUID()
    const storagePath = `${id}/items/${uuid}.webp`

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

    // Update checklist_items JSONB to append path to item's photo_storage_paths
    const checklistItems = inspection.checklist_items as any[] || []
    let itemFound = false

    for (const section of checklistItems) {
      for (const item of section.items || []) {
        if (item.item_id === itemId) {
          if (!item.photo_storage_paths) {
            item.photo_storage_paths = []
          }
          item.photo_storage_paths.push(storagePath)
          itemFound = true
          break
        }
      }
      if (itemFound) break
    }

    if (!itemFound) {
      return NextResponse.json(
        { error: 'Checklist item not found' },
        { status: 404 }
      )
    }

    // Save updated checklist_items
    const { error: updateError } = await supabase
      .from('inspections')
      .update({ checklist_items: checklistItems })
      .eq('id', id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: `Failed to update checklist: ${updateError.message}` },
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
        item_id: itemId,
        path: storagePath,
        url: urlData?.signedUrl || null,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/inspections/[id]/photos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
