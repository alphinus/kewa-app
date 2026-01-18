# Phase 9: External Contractor Portal - Research

**Researched:** 2026-01-18
**Domain:** Magic Link Authentication, PDF Generation, Contractor Portal UI
**Confidence:** HIGH (verified with existing codebase patterns, official docs, and established libraries)

## Summary

Phase 9 implements the External Contractor Portal where contractors receive work orders via magic link, view them in a dashboard, and can accept/reject/counter-offer. The existing codebase already has significant foundation work completed including magic link infrastructure, contractor portal skeleton, work order schema, and media upload patterns.

The research reveals that approximately 60-70% of the technical foundation is already implemented. The remaining work focuses on: (1) enhancing the existing contractor portal to show a dashboard of ALL work orders for a contractor rather than a single work order, (2) adding PDF generation for work orders, (3) implementing the counter-offer flow, and (4) adding file upload capabilities for contractors.

**Primary recommendation:** Extend existing patterns rather than building new infrastructure. The magic link, auth, and portal foundations are solid. Focus implementation effort on the dashboard view transformation, PDF generation with @react-pdf/renderer, and contractor upload functionality.

## Existing Codebase Patterns

### What Already Exists (HIGH Confidence - Verified from codebase)

#### Magic Link Infrastructure
| Component | Location | Status |
|-----------|----------|--------|
| Magic link tokens table | `supabase/migrations/024_magic_links.sql` | COMPLETE |
| Token create/validate functions | Database functions `create_magic_link_token`, `validate_magic_link_token` | COMPLETE |
| Token revocation | `revoke_magic_link_token`, `revoke_work_order_tokens` | COMPLETE |
| TypeScript utilities | `src/lib/magic-link.ts` | COMPLETE |
| Send API endpoint | `src/app/api/auth/magic-link/send/route.ts` | COMPLETE |
| Verify API endpoint | `src/app/api/auth/magic-link/verify/route.ts` | COMPLETE |
| Mailto link builder | In send route | COMPLETE |

#### Contractor Portal UI
| Component | Location | Status |
|-----------|----------|--------|
| Portal layout | `src/app/contractor/[token]/layout.tsx` | COMPLETE |
| Portal page | `src/app/contractor/[token]/page.tsx` | PARTIAL - shows single work order |
| Work order card | `src/app/contractor/[token]/work-order-card.tsx` | COMPLETE |
| Token error handling | `src/app/contractor/[token]/token-error.tsx` | COMPLETE |
| Status banner | In page.tsx | COMPLETE |

#### Work Order Schema
| Component | Location | Status |
|-----------|----------|--------|
| Work orders table | `supabase/migrations/013_work_order.sql` | COMPLETE |
| Status enum | `work_order_status` (9 states) | COMPLETE |
| Status transitions | `supabase/migrations/025_work_order_status.sql` | COMPLETE |
| Partner FK | Links to `partners` table | COMPLETE |
| Cost fields | `estimated_cost`, `proposed_cost`, `final_cost` | COMPLETE |
| Date fields | Requested/proposed/actual start/end | COMPLETE |
| Notes fields | `internal_notes`, `contractor_notes` | COMPLETE |
| Rejection tracking | `rejection_reason`, `rejected_at` | COMPLETE |

#### Authentication & Session
| Component | Location | Status |
|-----------|----------|--------|
| Session management | `src/lib/session.ts` | COMPLETE |
| Auth types | `src/types/auth.ts` | COMPLETE |
| External contractor role | In `UserRole` type | COMPLETE |
| Magic link verification | Creates contractor user if needed | COMPLETE |
| Audit logging | `src/lib/audit.ts` | COMPLETE |

#### Media/Upload Infrastructure
| Component | Location | Status |
|-----------|----------|--------|
| Media table | `supabase/migrations/015_media.sql` | COMPLETE |
| Storage buckets | Documented in `supabase/migrations/031_storage_buckets.sql` | COMPLETE |
| Photo upload API | `src/app/api/photos/route.ts` | COMPLETE - but role-restricted |
| Signed URLs | 1-hour expiry pattern | COMPLETE |

### What Needs Implementation

| Feature | Gap | Priority |
|---------|-----|----------|
| Dashboard view | Current portal shows single work order, needs to show ALL contractor's work orders | HIGH |
| Counter-offer flow | UI for proposing different price, KEWA approval/rejection | HIGH |
| PDF generation | No PDF library installed, need to generate work order PDFs | HIGH |
| Contractor uploads | Photo API is role-restricted (KEWA/Imeri only), need contractor access | MEDIUM |
| Request new link | Form for expired/completed links | MEDIUM |
| Rejection reasons | Select from predefined list + optional comment | MEDIUM |
| Deadline display | Show acceptance deadline prominently | LOW |

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | 3.x | PDF generation | React-native PDF, server-side, no Puppeteer needed |
| date-fns | 4.x | Date formatting | Already installed, Swiss locale support |
| jose | 6.x | JWT tokens | Already installed for sessions |

### Supporting Libraries (May Need)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-pdf/renderer | 3.4+ | Work order PDF generation | EXT-03 implementation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-pdf/renderer | jsPDF | Lower-level API, more verbose |
| @react-pdf/renderer | Puppeteer | Heavy runtime, needs Chrome, server-side only |
| @react-pdf/renderer | html-pdf | Deprecated, security issues |

**Installation:**
```bash
npm install @react-pdf/renderer
```

## Magic Link Implementation

### Current Architecture (Verified)

**Token Flow:**
```
1. KEWA creates work order, assigns partner
2. KEWA calls POST /api/auth/magic-link/send with email + workOrderId
3. API creates token via create_magic_link_token() DB function
4. API returns: { token, url, expiresAt, mailtoLink }
5. KEWA opens mailto link in local email client
6. Contractor clicks link: /contractor/{token}
7. Page validates token via peekMagicLink() (non-consuming)
8. Contractor interacts with portal
```

**Token Validation:**
```typescript
// src/lib/magic-link.ts - peekMagicLink()
// Checks: not expired, not revoked, not used
// Does NOT mark as used (allows multiple visits)
```

**Key Decision from Context:**
> Link leads to **dashboard showing all contractor's work orders** (not single work order)
> Link validity: **Until work order is complete** (contractor can bookmark)

### Gap: Dashboard vs Single Work Order

Current implementation shows a SINGLE work order linked to the token. Context specifies a DASHBOARD of ALL work orders for that contractor.

**Recommended Approach:**
1. Token validates to contractor email
2. Query ALL work orders for partners with that email
3. Display dashboard with cards for each work order
4. Cards show status, action needed, deadline

**Query Pattern:**
```typescript
// Get all work orders for contractor by email
const { data: workOrders } = await supabase
  .from('work_orders')
  .select(`
    *,
    room:rooms(
      id, name, room_type,
      unit:units(
        id, name,
        building:buildings(id, name, address)
      )
    ),
    partner:partners(id, company_name, email)
  `)
  .eq('partners.email', contractorEmail)
  .in('status', ['sent', 'viewed', 'accepted', 'in_progress'])
  .order('created_at', { ascending: false })
```

### Security Considerations

| Concern | Mitigation | Status |
|---------|------------|--------|
| Token guessing | UUID v4 tokens (122 bits entropy) | COMPLETE |
| Token expiry | Configurable (default 72h), but Context says "until complete" | NEEDS UPDATE |
| Token revocation | Functions exist | COMPLETE |
| Replay attacks | Token marked used on verify (but not peek) | COMPLETE |
| Session hijacking | JWT with 7-day expiry, httpOnly cookies | COMPLETE |

**Important:** Context says links are valid "until work order is complete" - need to update expiry logic to not expire based on time alone, but check work order status.

## PDF Generation

### Library Recommendation: @react-pdf/renderer

**Why @react-pdf/renderer:**
1. React-native syntax (familiar patterns)
2. Server-side generation in API routes
3. No Puppeteer/Chrome dependency
4. MIT licensed, actively maintained
5. Good typography control for German text

### Implementation Pattern

```typescript
// src/lib/pdf/work-order-pdf.tsx
import { Document, Page, Text, View, StyleSheet, renderToStream } from '@react-pdf/renderer';

interface WorkOrderPDFProps {
  workOrder: WorkOrderWithRelations;
  includeAttachments?: boolean;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '1px solid #333',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  section: {
    marginBottom: 15,
  },
  label: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
  },
});

export function WorkOrderPDF({ workOrder }: WorkOrderPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Arbeitsauftrag</Text>
          <Text style={{ fontSize: 10, color: '#666' }}>
            KEWA AG - {new Date().toLocaleDateString('de-CH')}
          </Text>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Auftrag</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
            {workOrder.title}
          </Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Standort</Text>
          <Text style={styles.value}>
            {workOrder.room?.unit?.building?.name}
          </Text>
          <Text style={styles.value}>
            {workOrder.room?.unit?.building?.address}
          </Text>
          <Text style={styles.value}>
            {workOrder.room?.unit?.name} - {workOrder.room?.name}
          </Text>
        </View>

        {/* Dates */}
        <View style={[styles.section, styles.grid]}>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Gewuenschter Beginn</Text>
            <Text style={styles.value}>
              {workOrder.requested_start_date
                ? new Date(workOrder.requested_start_date).toLocaleDateString('de-CH')
                : '-'}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.label}>Gewuenschtes Ende</Text>
            <Text style={styles.value}>
              {workOrder.requested_end_date
                ? new Date(workOrder.requested_end_date).toLocaleDateString('de-CH')
                : '-'}
            </Text>
          </View>
        </View>

        {/* Scope */}
        {workOrder.scope_of_work && (
          <View style={styles.section}>
            <Text style={styles.label}>Arbeitsumfang</Text>
            <Text style={styles.value}>{workOrder.scope_of_work}</Text>
          </View>
        )}

        {/* Cost */}
        <View style={styles.section}>
          <Text style={styles.label}>Geschaetzte Kosten</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
            CHF {workOrder.estimated_cost?.toLocaleString('de-CH') ?? '-'}
          </Text>
        </View>

        {/* Deadline */}
        {workOrder.acceptance_deadline && (
          <View style={styles.section}>
            <Text style={styles.label}>Antwort bis</Text>
            <Text style={{ fontSize: 12, color: '#c00' }}>
              {new Date(workOrder.acceptance_deadline).toLocaleDateString('de-CH')}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={{ position: 'absolute', bottom: 40, left: 40, right: 40 }}>
          <Text style={{ fontSize: 9, color: '#666', textAlign: 'center' }}>
            Bitte antworten Sie auf diese Anfrage ueber den Link in der Email.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// API route usage
export async function generateWorkOrderPDF(workOrder: WorkOrderWithRelations): Promise<Buffer> {
  const stream = await renderToStream(<WorkOrderPDF workOrder={workOrder} />);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
```

### API Route for PDF Generation

```typescript
// src/app/api/work-orders/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { generateWorkOrderPDF } from '@/lib/pdf/work-order-pdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session || !['kewa', 'imeri'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Fetch work order with relations
  const { data: workOrder, error } = await supabase
    .from('work_orders')
    .select(`
      *,
      room:rooms(
        id, name, room_type,
        unit:units(
          id, name,
          building:buildings(id, name, address)
        )
      ),
      partner:partners(id, company_name, contact_name)
    `)
    .eq('id', id)
    .single();

  if (error || !workOrder) {
    return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
  }

  const pdfBuffer = await generateWorkOrderPDF(workOrder);

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="arbeitsauftrag-${id.slice(0, 8)}.pdf"`,
    },
  });
}
```

## Mailto Integration

### Existing Implementation (Verified)

The mailto link builder already exists in `src/app/api/auth/magic-link/send/route.ts`:

```typescript
function buildMailtoLink(
  email: string,
  workOrderTitle: string,
  magicLinkUrl: string,
  expiresAt: Date
): string {
  const subject = encodeURIComponent(`Arbeitsauftrag: ${workOrderTitle}`)
  const body = encodeURIComponent(
    `Guten Tag,\n\n` +
    `Sie haben einen neuen Arbeitsauftrag erhalten.\n\n` +
    `Bitte klicken Sie auf den folgenden Link, um den Auftrag anzusehen:\n` +
    `${magicLinkUrl}\n\n` +
    `Der Link ist gueltig bis: ${expiresAt.toLocaleDateString('de-CH')} ${expiresAt.toLocaleTimeString('de-CH')}\n\n` +
    `Mit freundlichen Gruessen\n` +
    `KEWA AG`
  )
  return `mailto:${email}?subject=${subject}&body=${body}`
}
```

### Enhancement for PDF Attachment

Context decision: "KEWA chooses per work order whether to attach PDF or just include link"

Mailto links cannot attach files programmatically. Options:

1. **Download + manual attach** (Recommended)
   - Generate PDF
   - Download to user's device
   - Open mailto link
   - User attaches PDF manually

2. **Show instructions**
   - "Download the PDF below, then attach to your email"

**UI Pattern:**
```typescript
// In work order send UI
<div className="flex gap-3">
  <Button onClick={downloadPDF}>
    Download PDF
  </Button>
  <Button onClick={openMailto}>
    Open Email
  </Button>
</div>
<p className="text-sm text-gray-500">
  If you want to attach the PDF, download it first, then attach manually.
</p>
```

## File Upload Patterns

### Existing Pattern (from photos API)

```typescript
// Storage path convention (from 031_storage_buckets.sql)
// work_orders/{work_order_id}/documents/{uuid}.pdf
// work_orders/{work_order_id}/photos/{context}/{uuid}.webp

// Upload flow:
// 1. Parse FormData
// 2. Validate file type/size
// 3. Generate unique path
// 4. Upload to Supabase Storage
// 5. Insert media record
// 6. Return signed URL
```

### Contractor Upload API

New API route needed for contractor uploads:

```typescript
// src/app/api/contractor/[token]/upload/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate token
  const validation = await peekMagicLink(token);
  if (!validation.valid || !validation.workOrderId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Parse form data
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const mediaType = formData.get('type') as 'photo' | 'document';
  const context = formData.get('context') as string; // 'completion', 'offer', 'invoice'

  // Validate file
  if (!file) {
    return NextResponse.json({ error: 'File required' }, { status: 400 });
  }

  // Size limits
  const maxSize = mediaType === 'document' ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  // Generate path
  const fileId = crypto.randomUUID();
  const ext = file.name.split('.').pop() || 'bin';
  const storagePath = `work_orders/${validation.workOrderId}/${mediaType}s/${context}/${fileId}.${ext}`;

  // Upload
  const supabase = await createClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(storagePath, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  // Create media record
  const { data: media, error: insertError } = await supabase
    .from('media')
    .insert({
      entity_type: 'work_order',
      entity_id: validation.workOrderId,
      media_type: mediaType,
      context: context,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      // No uploaded_by - contractor doesn't have user record necessarily
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from('media').remove([storagePath]);
    return NextResponse.json({ error: 'Record failed' }, { status: 500 });
  }

  // Return signed URL
  const { data: signedUrl } = await supabase.storage
    .from('media')
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json({
    media: { ...media, url: signedUrl?.signedUrl }
  }, { status: 201 });
}
```

## Contractor Portal Architecture

### Route Structure

```
src/app/contractor/
  [token]/
    layout.tsx      # Mobile-optimized shell (EXISTS)
    page.tsx        # Dashboard (NEEDS: show all work orders)
    token-error.tsx # Error states (EXISTS)
    work-order-card.tsx # Card component (EXISTS, needs enhancement)

    # New routes needed:
    upload/
      route.ts      # File upload API
    [workOrderId]/
      page.tsx      # Single work order detail view
      status/
        route.ts    # Status update API (accept/reject/etc)
```

### Dashboard Transformation

Current `page.tsx` shows single work order. Transform to:

```typescript
// src/app/contractor/[token]/page.tsx
export default async function ContractorDashboard({ params }: Props) {
  const { token } = await params;

  // Validate token (non-consuming)
  const validation = await peekMagicLink(token);
  if (!validation.valid) {
    return <TokenError error={validation.error ?? 'not_found'} />;
  }

  // Get ALL work orders for this contractor
  const workOrders = await getContractorWorkOrders(validation.email!);

  // Separate by action status
  const needsAction = workOrders.filter(wo =>
    ['sent', 'viewed'].includes(wo.status)
  );
  const inProgress = workOrders.filter(wo =>
    ['accepted', 'in_progress'].includes(wo.status)
  );
  const completed = workOrders.filter(wo =>
    ['done', 'inspected', 'closed'].includes(wo.status)
  );

  return (
    <div className="space-y-6">
      {/* Action Needed Section */}
      {needsAction.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-orange-700">
            Handlungsbedarf ({needsAction.length})
          </h2>
          <div className="space-y-4">
            {needsAction.map(wo => (
              <WorkOrderCard
                key={wo.id}
                workOrder={wo}
                token={token}
                isActionNeeded
              />
            ))}
          </div>
        </section>
      )}

      {/* In Progress Section */}
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-purple-700">
            In Arbeit ({inProgress.length})
          </h2>
          <div className="space-y-4">
            {inProgress.map(wo => (
              <WorkOrderCard
                key={wo.id}
                workOrder={wo}
                token={token}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Section (collapsed by default) */}
      {completed.length > 0 && (
        <details className="group">
          <summary className="text-lg font-semibold mb-3 text-gray-500 cursor-pointer">
            Abgeschlossen ({completed.length})
          </summary>
          <div className="space-y-4 mt-3">
            {completed.map(wo => (
              <WorkOrderCard
                key={wo.id}
                workOrder={wo}
                token={token}
                isCompleted
              />
            ))}
          </div>
        </details>
      )}

      {/* Empty State */}
      {workOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Keine Arbeitsauftraege vorhanden.</p>
        </div>
      )}
    </div>
  );
}
```

### Counter-Offer Flow

Context: "Counter-offer: Supported - contractor can propose different price, KEWA approves/rejects"

**UI Flow:**
1. Contractor views work order with estimated_cost
2. Contractor enters proposed_cost (different from estimated)
3. Contractor clicks "Accept with different price"
4. Status stays "viewed" with proposed_cost saved
5. KEWA sees counter-offer in admin UI
6. KEWA approves (status -> accepted) or rejects (back to contractor)

**Status API Enhancement:**
```typescript
// POST /api/contractor/[token]/status
// Body: { status: 'counter_offer', proposed_cost: 1500, contractor_notes: '...' }

// This doesn't change work_order_status enum
// Instead: status stays 'viewed', proposed_cost != estimated_cost flags counter-offer
```

### Rejection Reasons

Context: "Rejection: Reason required - select from list + optional comment"

```typescript
const REJECTION_REASONS = [
  { id: 'capacity', label: 'Kapazitaet', description: 'Keine freie Kapazitaet im Zeitraum' },
  { id: 'location', label: 'Standort', description: 'Standort zu weit entfernt' },
  { id: 'scope', label: 'Arbeitsumfang', description: 'Arbeitsumfang nicht passend' },
  { id: 'other', label: 'Sonstiges', description: 'Anderer Grund (bitte angeben)' },
] as const;

// Rejection modal stores: rejection_reason = 'capacity' or 'location|Zu weit fuer uns'
```

## Critical Dependencies

### From Phase 7 (Foundation Data Model)

| Dependency | Status | Notes |
|------------|--------|-------|
| Work orders table | COMPLETE | Full schema with all needed fields |
| Partners table | COMPLETE | Email field for contractor lookup |
| Media table | COMPLETE | Polymorphic attachment support |
| Status transitions | COMPLETE | Trigger enforces valid flows |
| Audit logging | COMPLETE | Auth and data change logging |

### From Phase 8 (Template System)

| Dependency | Status | Notes |
|------------|--------|-------|
| Renovation projects | COMPLETE | Work orders can link to projects |
| Tasks | COMPLETE | Work orders can link to tasks |
| Quality gates | COMPLETE | Not directly needed for portal |

### Gaps Identified

| Gap | Impact | Resolution |
|-----|--------|------------|
| PDF library not installed | Cannot generate work order PDFs | Install @react-pdf/renderer |
| Contractor upload API missing | Contractors cannot upload files | Create new API route |
| Dashboard query needs partner email lookup | Cannot show all contractor work orders | Query via partners.email join |
| Token expiry logic | Context wants "until complete" not time-based | Update magic link expiry check |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | HTML-to-PDF conversion | @react-pdf/renderer | Predictable output, no browser needed |
| Token security | Custom token scheme | UUID v4 + DB validation | Sufficient entropy, audit trail |
| File uploads | Raw stream handling | Supabase Storage + FormData | Built-in security, signed URLs |
| Email sending | SMTP client | mailto: links | No server config, user's email client |

**Key insight:** The existing magic link infrastructure is solid. Don't replace it, extend it.

## Common Pitfalls

### Pitfall 1: Single Work Order vs Dashboard

**What goes wrong:** Portal shows only the work order from token, not all contractor work orders
**Why it happens:** Token links to specific work_order_id
**How to avoid:** Query by contractor email, not by work_order_id
**Warning signs:** Contractor asks "where are my other jobs?"

### Pitfall 2: Token Expiry vs Work Order Completion

**What goes wrong:** Token expires while work is still in progress
**Why it happens:** Default 72h expiry doesn't account for multi-week jobs
**How to avoid:** Check work order status, not just token timestamp
**Warning signs:** Contractor locked out mid-job

### Pitfall 3: Counter-Offer State Confusion

**What goes wrong:** KEWA doesn't see counter-offer, contractor thinks it was sent
**Why it happens:** No clear status indicator for "awaiting KEWA decision"
**How to avoid:** Distinct UI state for counter-offer pending
**Warning signs:** "I sent a counter-offer days ago, no response"

### Pitfall 4: Upload Without User Context

**What goes wrong:** Media records have no uploaded_by, can't track who uploaded
**Why it happens:** Contractor may not have user record
**How to avoid:** Create/link contractor user on first magic link use (already done!)
**Warning signs:** Audit trail incomplete

### Pitfall 5: Mobile Upload Failures

**What goes wrong:** Large files fail on mobile connections
**Why it happens:** Network timeouts, no retry logic
**How to avoid:** Chunk uploads, progress indication, retry button
**Warning signs:** "Upload stuck at 80%" on mobile

## Code Examples

### Token Validation with Work Order Status Check

```typescript
// Enhanced magic link validation
export async function validateContractorAccess(token: string): Promise<{
  valid: boolean;
  email?: string;
  error?: 'expired' | 'used' | 'revoked' | 'not_found' | 'work_order_closed';
}> {
  const supabase = await createClient();

  // Find token
  const { data: tokenData } = await supabase
    .from('magic_link_tokens')
    .select('*, work_orders(status)')
    .eq('token', token)
    .single();

  if (!tokenData) return { valid: false, error: 'not_found' };
  if (tokenData.is_revoked) return { valid: false, error: 'revoked' };

  // Check work order status - allow access unless closed
  const woStatus = tokenData.work_orders?.status;
  if (woStatus === 'closed') {
    return { valid: false, error: 'work_order_closed' };
  }

  // Time-based expiry still applies for never-viewed tokens
  if (woStatus === 'draft' || woStatus === 'sent') {
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, error: 'expired' };
    }
  }

  return { valid: true, email: tokenData.email };
}
```

### Work Order Dashboard Query

```typescript
async function getContractorWorkOrders(email: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('work_orders')
    .select(`
      id,
      title,
      description,
      scope_of_work,
      status,
      requested_start_date,
      requested_end_date,
      estimated_cost,
      proposed_cost,
      acceptance_deadline,
      contractor_notes,
      created_at,
      room:rooms (
        id,
        name,
        room_type,
        unit:units (
          id,
          name,
          building:buildings (
            id,
            name,
            address
          )
        )
      ),
      partner:partners!inner (
        id,
        company_name,
        email
      )
    `)
    .eq('partners.email', email.toLowerCase())
    .not('status', 'eq', 'draft')
    .order('created_at', { ascending: false });

  return data || [];
}
```

## State of the Art (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side PDF (Puppeteer) | @react-pdf/renderer | 2023+ | No Chrome dependency |
| Magic link as GET param | Magic link in URL path | Best practice | Cleaner URLs, no query params |
| Single-use tokens | Status-aware expiry | Context decision | Better UX for contractors |
| Email via SMTP | mailto: links | Project constraint | Works with any email client |

**New patterns to consider:**
- Signed URL refresh on dashboard (avoid 1-hour expiry issues)
- Progressive upload with resume capability

**Deprecated/outdated:**
- html-pdf: Security vulnerabilities, archived
- PhantomJS-based PDF: End of life

## Open Questions

### 1. Counter-Offer Approval UI

**What we know:** Counter-offer is supported, KEWA approves/rejects
**What's unclear:** Where in KEWA admin UI does approval happen?
**Recommendation:** Add to work order detail page with accept/reject counter-offer buttons

### 2. Multiple Active Tokens

**What we know:** Contractor can bookmark link
**What's unclear:** What if KEWA sends new link? Revoke old? Allow both?
**Recommendation:** Allow multiple active tokens, revoke when work order changes partner

### 3. Request New Link Flow

**What we know:** Expired/completed links should show "Request new link" form
**What's unclear:** Does this create immediate link or notify KEWA?
**Recommendation:** Form collects email, KEWA receives notification, KEWA decides to send

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/magic-link.ts`, `src/app/contractor/[token]/*`
- Existing migrations: `024_magic_links.sql`, `013_work_order.sql`, `015_media.sql`
- Phase 9 context: `09-CONTEXT.md` with implementation decisions
- @react-pdf/renderer docs: https://react-pdf.org/

### Secondary (MEDIUM confidence)
- Supabase Storage docs: https://supabase.com/docs/guides/storage
- Next.js 16 App Router: https://nextjs.org/docs/app

### Tertiary (LOW confidence)
- mailto: URL scheme: RFC 6068 (well-established)

## Metadata

**Confidence breakdown:**
- Existing patterns: HIGH - verified from codebase
- Magic link architecture: HIGH - fully implemented
- PDF generation: MEDIUM - library chosen, pattern designed, not tested
- Contractor uploads: MEDIUM - pattern follows existing photos API
- Dashboard transformation: HIGH - query patterns clear

**Research date:** 2026-01-18
**Valid until:** 2026-02-17 (30 days - stable technologies)

---

## Implementation Priority

Based on research, recommended implementation order:

1. **Dashboard transformation** (HIGH priority)
   - Query all contractor work orders by email
   - Group by action status
   - Extends existing portal, minimal new code

2. **PDF generation** (HIGH priority)
   - Install @react-pdf/renderer
   - Create work order PDF template
   - Add API route for generation
   - Required for EXT-03

3. **Counter-offer flow** (HIGH priority)
   - Enhance status update API
   - Add proposed_cost tracking
   - UI for KEWA approval
   - Core to contractor negotiation

4. **Contractor uploads** (MEDIUM priority)
   - New API route
   - Uses existing media/storage patterns
   - Required for EXT-11, EXT-12

5. **Rejection reasons** (MEDIUM priority)
   - Predefined list + comment
   - Simple form enhancement

6. **Token expiry update** (MEDIUM priority)
   - Status-aware instead of time-based
   - Aligns with context decision

7. **Request new link** (LOW priority)
   - Nice-to-have for completed/expired
   - Can be simple email link initially
