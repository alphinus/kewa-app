# Supabase Storage Setup

This document describes the required storage bucket configuration for the KEWA Renovations Operations System.

## Required Buckets

### 1. task-photos (exists from v1)

```bash
# Create via Supabase CLI
supabase storage create task-photos --public=false
```

**Configuration:**
- Public: false
- Max file size: 10MB
- Allowed MIME types: `image/webp`, `image/jpeg`, `image/png`
- Purpose: Task explanation and completion photos

**Path convention:**
```
tasks/{task_id}/photos/{photo_type}/{uuid}.webp
```

### 2. task-audio (exists from v1)

```bash
supabase storage create task-audio --public=false
```

**Configuration:**
- Public: false
- Max file size: 50MB
- Allowed MIME types: `audio/webm`, `audio/mp4`, `audio/mpeg`
- Purpose: Voice notes and audio explanations

**Path convention:**
```
tasks/{task_id}/audio/{audio_type}/{uuid}.webm
```

### 3. documents (new)

```bash
supabase storage create documents --public=false
```

**Configuration:**
- Public: false
- Max file size: 20MB
- Allowed MIME types: `application/pdf`, `image/*`
- Purpose: Contracts, permits, approvals

**Path convention:**
```
work_orders/{work_order_id}/documents/{uuid}.pdf
offers/{offer_id}/{uuid}.pdf
invoices/{invoice_id}/{uuid}.pdf
units/{unit_id}/documents/{uuid}.pdf
```

### 4. media (new - unified)

```bash
supabase storage create media --public=false
```

**Configuration:**
- Public: false
- Max file size: 50MB
- Allowed MIME types: `image/*`, `video/*`, `audio/*`, `application/pdf`
- Purpose: All media types for any entity

**Path convention:**
```
rooms/{room_id}/media/{context}/{uuid}.{ext}
receipts/{expense_id}/{uuid}.pdf
```

## Storage Policies

Configure in Supabase Dashboard under Storage > Policies:

### Policy 1: Internal users full access

```sql
-- SELECT (download)
CREATE POLICY "Internal users can view all files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.is_internal = true
  )
);

-- INSERT (upload)
CREATE POLICY "Internal users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.is_internal = true
  )
);

-- UPDATE (overwrite)
CREATE POLICY "Internal users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.is_internal = true
  )
);

-- DELETE
CREATE POLICY "Internal users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.is_internal = true
  )
);
```

### Policy 2: Tenants access their unit files

```sql
CREATE POLICY "Tenants can view their unit files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  -- rooms/{room_id}/... pattern
  (name LIKE 'rooms/%' AND
   EXISTS (
     SELECT 1 FROM rooms r
     JOIN tenant_users tu ON tu.unit_id = r.unit_id
     WHERE tu.user_id = auth.uid()
       AND split_part(name, '/', 2)::UUID = r.id
   ))
  OR
  -- units/{unit_id}/... pattern
  (name LIKE 'units/%' AND
   EXISTS (
     SELECT 1 FROM tenant_users tu
     WHERE tu.user_id = auth.uid()
       AND split_part(name, '/', 2)::UUID = tu.unit_id
   ))
);
```

### Policy 3: Contractors access their work order files

```sql
CREATE POLICY "Contractors can view work order files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  name LIKE 'work_orders/%' AND
  EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN partners p ON wo.partner_id = p.id
    JOIN users u ON u.email = p.email
    WHERE u.id = auth.uid()
      AND split_part(name, '/', 2)::UUID = wo.id
  )
);

CREATE POLICY "Contractors can upload to work orders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  name LIKE 'work_orders/%' AND
  EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN partners p ON wo.partner_id = p.id
    JOIN users u ON u.email = p.email
    WHERE u.id = auth.uid()
      AND split_part(name, '/', 2)::UUID = wo.id
  )
);
```

## Image Processing Guidelines

### Before Upload

1. **Compress images to WebP format**
   - Max width: 1920px
   - Quality: 80%
   - Strip EXIF (except orientation)

2. **Generate thumbnail**
   - Width: 200px
   - Store at: `{path}/thumb/{filename}`

### Code Example

```typescript
// src/lib/imageCompression.ts
import { compressImage } from '@/lib/imageCompression';

const compressed = await compressImage(file, {
  maxWidth: 1920,
  quality: 0.8,
  format: 'webp'
});

const thumbnail = await compressImage(file, {
  maxWidth: 200,
  quality: 0.7,
  format: 'webp'
});
```

## Audio Processing Guidelines

1. **Transcribe using Whisper API**
2. **Store transcription in `media.transcription` field**
3. **Update `media.transcription_status`**: pending -> processing -> completed/failed

## Signed URLs

Use signed URLs for temporary access:

```typescript
// Generate signed URL (valid for 1 hour)
const { data, error } = await supabase.storage
  .from('documents')
  .createSignedUrl('invoices/123/abc.pdf', 3600);
```

## Verification

After setup, verify buckets exist:

```bash
supabase storage list
```

Expected output:
```
task-photos
task-audio
documents
media
```

## Migration Checklist

- [ ] Create `documents` bucket in Supabase Dashboard
- [ ] Create `media` bucket in Supabase Dashboard
- [ ] Configure file size limits for each bucket
- [ ] Apply storage policies via Dashboard or SQL Editor
- [ ] Test upload/download for each role type
- [ ] Verify signed URL generation works
