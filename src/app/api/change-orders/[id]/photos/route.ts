/**
 * Change Order Photos API
 *
 * GET: List all photos for a change order with signed URLs
 * POST: Upload a new photo
 * DELETE: Remove a photo
 *
 * Phase 21-03: Photo Evidence and PDF Generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/change-orders/[id]/photos
 *
 * List photos for a change order with signed URLs (1-hour expiry)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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

    // Verify change order exists
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .select('id')
      .eq('id', id)
      .single()

    if (coError || !changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    // Fetch photos
    const { data: photos, error: photosError } = await supabase
      .from('change_order_photos')
      .select('*')
      .eq('change_order_id', id)
      .order('uploaded_at', { ascending: false })

    if (photosError) {
      console.error('Error fetching photos:', photosError)
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }

    // Generate signed URLs for each photo (1-hour expiry)
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const { data: signedData } = await supabase.storage
          .from('media')
          .createSignedUrl(photo.storage_path, 3600) // 1 hour

        return {
          ...photo,
          signedUrl: signedData?.signedUrl || null,
        }
      })
    )

    return NextResponse.json({ photos: photosWithUrls })
  } catch (error) {
    console.error('Error in GET /api/change-orders/[id]/photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/change-orders/[id]/photos
 *
 * Upload a new photo for the change order
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
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

    // Verify change order exists
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .select('id')
      .eq('id', id)
      .single()

    if (coError || !changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const caption = formData.get('caption') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    }

    // Generate storage path: change_orders/{co_id}/photos/{timestamp}-{filename}
    const timestamp = Date.now()
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_') // Sanitize filename
    const storagePath = `change_orders/${id}/photos/${timestamp}-${filename}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Insert photo record
    const { data: photo, error: insertError } = await supabase
      .from('change_order_photos')
      .insert({
        change_order_id: id,
        storage_path: storagePath,
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption: caption || null,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting photo record:', insertError)
      // Clean up uploaded file
      await supabase.storage.from('media').remove([storagePath])
      return NextResponse.json({ error: 'Failed to create photo record' }, { status: 500 })
    }

    // Generate signed URL for response
    const { data: signedData } = await supabase.storage
      .from('media')
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json(
      {
        photo: {
          ...photo,
          signedUrl: signedData?.signedUrl || null,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/change-orders/[id]/photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/change-orders/[id]/photos
 *
 * Delete a photo (expects ?photo_id query param)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photo_id')

    if (!photoId) {
      return NextResponse.json({ error: 'Missing photo_id parameter' }, { status: 400 })
    }

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

    // Fetch photo to get storage path
    const { data: photo, error: fetchError } = await supabase
      .from('change_order_photos')
      .select('*')
      .eq('id', photoId)
      .eq('change_order_id', id)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('media')
      .remove([photo.storage_path])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
      // Continue with database deletion even if storage fails
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('change_order_photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      console.error('Error deleting photo record:', deleteError)
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/change-orders/[id]/photos:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
