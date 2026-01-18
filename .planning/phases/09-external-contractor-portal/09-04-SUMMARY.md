---
phase: 09
plan: 04
subsystem: contractor-portal
tags: [file-upload, media, storage, mobile-ui]
dependency-graph:
  requires: [09-01, 09-02]
  provides: [contractor-file-uploads, media-gallery, completion-flow]
  affects: [10, 11]
tech-stack:
  added: []
  patterns: [polymorphic-media, signed-urls, mobile-optimized-upload]
key-files:
  created:
    - src/lib/storage/contractor-upload.ts
    - src/app/api/contractor/[token]/[workOrderId]/upload/route.ts
    - src/app/api/contractor/[token]/[workOrderId]/media/route.ts
    - src/components/upload/FileUploader.tsx
    - src/app/contractor/[token]/[workOrderId]/upload-section.tsx
    - src/app/contractor/[token]/[workOrderId]/media-gallery.tsx
  modified:
    - src/app/contractor/[token]/[workOrderId]/page.tsx
    - src/app/contractor/[token]/work-order-card.tsx
decisions:
  - Storage bucket 'media' for unified uploads
  - Photos max 10MB, documents max 20MB
  - Status-aware upload/delete permissions
  - Lightbox for photo viewing
metrics:
  duration: ~25 min
  completed: 2026-01-18
---

# Phase 9 Plan 04: Contractor File Uploads Summary

**One-liner:** Mobile-optimized file upload for contractors with photo gallery, document management, and completion flow integration.

## What Was Built

### 1. Contractor Upload Utilities (`src/lib/storage/contractor-upload.ts`)

Validation and path generation for contractor file uploads:
- `validateContractorUpload`: File type and size validation
- `generateStoragePath`: Work order storage path generation
- Photo limits: 10MB max, image/* mime types
- Document limits: 20MB max, application/pdf
- Helper functions: `formatFileSize`, `getContextLabel`
- Context labels in German for UI

### 2. Contractor Upload API (`src/app/api/contractor/[token]/[workOrderId]/upload/route.ts`)

POST endpoint for file uploads:
- Validates token and work order access
- Accepts multipart/form-data with file, type, context
- Uploads to Supabase Storage (media bucket)
- Creates polymorphic media table record
- Returns media record with signed URL (1 hour expiry)
- Status-aware: only allows uploads for accepted/in_progress/done

### 3. Contractor Media API (`src/app/api/contractor/[token]/[workOrderId]/media/route.ts`)

GET and DELETE endpoints:
- GET returns all media for work order with fresh signed URLs
- DELETE removes media (only for accepted/in_progress status)
- Filters by type if query param provided
- Validates contractor access via token

### 4. FileUploader Component (`src/components/upload/FileUploader.tsx`)

Mobile-optimized upload UI:
- Drag-and-drop (desktop) or tap to select (mobile)
- Camera capture option for photos (mobile)
- Progress indicator during upload
- Preview thumbnails after upload
- Delete button on uploaded items
- Accept prop for allowed file types
- Min 44px touch targets

### 5. UploadSection Component (`src/app/contractor/[token]/[workOrderId]/upload-section.tsx`)

Section in work order detail:
- Tabs for Photos and Documents
- Context selector (completion, offer, invoice, before, after, during, other)
- FileUploader instance for each tab
- Count badge showing uploaded items
- Loads existing media on mount
- Status-aware enable/disable

### 6. MediaGallery Component (`src/app/contractor/[token]/[workOrderId]/media-gallery.tsx`)

Media viewing:
- Grid display for uploaded photos (3-4 columns)
- List display for documents with download links
- Lightbox for full-screen photo viewing with keyboard navigation
- Filter by media type (all/photos/documents)
- Delete option when status allows
- Context badges on photos

### 7. Work Order Detail Integration

Updated page to include upload and gallery:
- Show UploadSection when status is accepted/in_progress/done
- Show MediaGallery for done/inspected/closed (read-only for closed)
- Update UI after successful upload

### 8. Completion Flow

Enhanced "Mark Complete" functionality:
- CompletionSection component with photo upload tip
- Confirmation modal before marking complete
- Prompt to upload completion photos before done
- Status update to 'done' on confirm

## Storage Path Conventions

Following `031_storage_buckets.sql`:
```
work_orders/{work_order_id}/documents/{uuid}.pdf
work_orders/{work_order_id}/photos/{context}/{uuid}.webp
```

## Implementation Notes

### Status-Based Permissions

| Status | Upload | Delete | View |
|--------|--------|--------|------|
| sent/viewed | No | No | No |
| accepted | Yes | Yes | Yes |
| in_progress | Yes | Yes | Yes |
| done | Yes | No | Yes |
| inspected | No | No | Yes |
| closed | No | No | Yes (read-only) |

### Media Context Mapping

Upload contexts mapped to database enum:
- offer, invoice -> documentation
- completion, after -> after
- before -> before
- during -> during
- other -> other

## Requirements Fulfilled

- **EXT-11**: Document upload (offers, invoices) - DONE
- **EXT-12**: Photo upload (completion photos) - DONE

## Commits

| Hash | Description |
|------|-------------|
| ee1886a | feat(09-04): add contractor upload utilities |
| 2675425 | feat(09-04): add contractor upload API endpoint |
| fd0844d | feat(09-04): add contractor media list/delete API |
| ddf3f55 | feat(09-04): add mobile-optimized FileUploader component |
| ef83d88 | feat(09-04): add UploadSection component for work order detail |
| b1b3f4a | feat(09-04): add MediaGallery component for viewing uploads |
| fdfe57c | feat(09-04): integrate upload section and media gallery in work order detail |
| 0865893 | feat(09-04): add completion flow with photo upload prompt |
| f58e619 | fix(09-04): fix TypeScript type error in document validation |

## Deviations from Plan

None - plan executed exactly as written.

## Testing Checklist

- [ ] Contractor can upload photos via portal
- [ ] Contractor can upload PDF documents
- [ ] File size limits enforced (10MB photos, 20MB documents)
- [ ] Media records created in database
- [ ] Signed URLs generated for viewing
- [ ] Gallery displays uploaded media
- [ ] Delete removes media (when allowed)
- [ ] Camera capture works on mobile
- [ ] Lightbox opens for photos
- [ ] Documents have download link

## Next Phase Readiness

Phase 9 Plan 05 (Tracking & Event Logging) can proceed. This plan provides:
- Media records with timestamps for audit trail
- Status changes tracked via existing work order updates
- File upload events in media table

## Notes

- Uses existing media table with polymorphic attachment pattern
- Signed URLs expire in 1 hour - gallery auto-refreshes on load
- No thumbnail generation yet - could be added for performance
- Mobile camera capture uses `capture="environment"` for back camera
