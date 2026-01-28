# Phase 22: Inspection Core - Research

**Researched:** 2026-01-28
**Domain:** Construction inspection workflows, digital checklists, defect management, signature capture
**Confidence:** HIGH

## Summary

Phase 22 implements inspection workflows for construction projects with template-based checklists, defect logging, photo evidence, and digital signature capture. Research confirms this requires four interconnected subsystems:

1. **Inspection Templates and Execution**: Trade-specific inspection templates (per Gewerk) that populate checklists at creation time. Each inspection links to work order/project with editable checklist items (pass/fail/na result per item). Templates are starting points only - inspector can customize items post-creation. Structure uses JSONB for checklist items (same pattern as quality gates) with sections/groups for organization.

2. **Defect/Snag Management with Lifecycle**: Defects use three-tier severity classification (Gering/Mittel/Schwer - industry standard). Defects have independent lifecycle (open → in_progress → resolved) separate from linked task status. Can originate from failed checklist items (auto-linked) OR be added independently for issues outside formal checklist. Post-inspection review lets user decide action: Create task / Defer to next inspection / Dismiss.

3. **Signature Capture and PDF Generation**: Digital signature uses react-signature-canvas (wrapper around signature_pad, 100% test coverage, HIGH source reputation). Captures both canvas drawing AND typed name for identification. Signature stored as PNG in dedicated inspections bucket (separate from media bucket per Phase 22 context decision). PDF generation reuses @react-pdf/renderer from work orders/change orders. Signature embedded in PDF as image.

4. **Photo Evidence Storage**: Dedicated `inspections` bucket (not media bucket - explicit Phase 22 decision). Path pattern: `inspections/{inspection_id}/defects/{uuid}.webp` for defect photos, `inspections/{inspection_id}/items/{uuid}.webp` for checklist item photos. Signed URLs with 1-hour expiry (same pattern as knowledge base attachments).

**Primary recommendation:** Extend proven patterns from existing modules. Inspection templates follow quality gate checklist pattern (JSONB with sections). Defect management uses status workflow pattern from purchase orders/change orders. Signature capture with react-signature-canvas. PDF generation reuses work order/change order PDF patterns. Storage uses new dedicated bucket with existing signed URL patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | existing | API routes + Server Components | Already in stack |
| Supabase | existing | Database + Storage + Auth | Already in stack |
| PostgreSQL | existing | JSONB, triggers, enums, status workflow | Already in stack |
| @react-pdf/renderer | ^4.3.2 | PDF protocol generation | Already in stack for work orders/change orders |
| react-signature-canvas | ^2.0+ | Signature capture component | HIGH source reputation, 100% test coverage, 362+ dependents |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| signature_pad | 5.0+ | Canvas signature library (peer dep) | Auto-installed with react-signature-canvas |
| date-fns | existing | Date formatting (Swiss German) | Already in stack |
| Zod | existing | API input validation | Already in stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-signature-canvas | react-sketch-canvas | More features (SVG) but overkill for simple signatures |
| JSONB checklist items | Separate table | JSONB simpler, consistent with quality gates pattern |
| Dedicated inspections bucket | Reuse media bucket | Separate bucket better for lifecycle management and permissions |
| Independent defect lifecycle | Derive from task status | Independent lifecycle more flexible, matches real workflow |

**Installation:**
```bash
npm install react-signature-canvas
# signature_pad installed automatically as peer dependency
# All other dependencies already in stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── inspections/
│   │   │   ├── route.ts                      # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts                  # GET, PATCH, DELETE
│   │   │       ├── complete/route.ts         # POST (mark inspection complete)
│   │   │       ├── defects/
│   │   │       │   ├── route.ts              # GET (list defects), POST (add defect)
│   │   │       │   └── [defectId]/
│   │   │       │       ├── route.ts          # PATCH, DELETE
│   │   │       │       └── photos/route.ts   # GET, POST defect photos
│   │   │       ├── signature/route.ts        # POST (save signature PNG)
│   │   │       ├── pdf/route.ts              # GET (download PDF protocol)
│   │   │       └── photos/route.ts           # GET, POST (checklist item photos)
│   │   ├── inspection-templates/
│   │   │   ├── route.ts                      # GET (list), POST (create)
│   │   │   └── [id]/route.ts                 # GET, PATCH, DELETE
│   │   └── work-orders/
│   │       └── [id]/
│   │           └── inspections/route.ts      # GET (list inspections for WO)
│   ├── dashboard/
│   │   ├── abnahmen/                         # German: Inspections
│   │   │   ├── page.tsx                      # Inspection list
│   │   │   ├── neu/page.tsx                  # Create inspection (select template)
│   │   │   └── [id]/
│   │   │       ├── page.tsx                  # Inspection detail
│   │   │       ├── checkliste/page.tsx       # Checklist execution
│   │   │       ├── maengel/page.tsx          # Defect review & action
│   │   │       └── unterschrift/page.tsx     # Signature capture
│   │   └── vorlagen/
│   │       └── abnahmen/                     # Inspection templates
│   │           ├── page.tsx                  # Template list
│   │           ├── neu/page.tsx              # Create template
│   │           └── [id]/page.tsx             # Edit template
│   └── portal/
│       └── inspections/
│           └── [token]/page.tsx              # Contractor signature portal (Phase 23)
├── components/
│   └── inspections/
│       ├── InspectionForm.tsx                # Create inspection (template selection)
│       ├── InspectionStatusBadge.tsx         # Status indicator
│       ├── InspectionList.tsx                # Filterable list
│       ├── InspectionDetail.tsx              # Full inspection display
│       ├── ChecklistEditor.tsx               # Template checklist editor
│       ├── ChecklistExecution.tsx            # Runtime checklist (pass/fail/na)
│       ├── ChecklistItemCard.tsx             # Single item with photo upload
│       ├── DefectForm.tsx                    # Add/edit defect
│       ├── DefectList.tsx                    # Defect list with severity badges
│       ├── DefectReviewCard.tsx              # Post-inspection defect action selector
│       ├── SeverityBadge.tsx                 # Color-coded severity (Gering/Mittel/Schwer)
│       ├── SignatureCapture.tsx              # Canvas + typed name input
│       ├── PhotoEvidenceUpload.tsx           # Multi-photo upload (reuse from change orders)
│       ├── PhotoGallery.tsx                  # Lightbox viewer (reuse)
│       └── InspectionPDF.tsx                 # PDF protocol template
├── lib/
│   ├── inspections/
│   │   ├── queries.ts                        # Database queries
│   │   ├── workflow.ts                       # Status transition validation
│   │   ├── template-population.ts            # Template → inspection checklist
│   │   ├── defect-actions.ts                 # Create task / Defer / Dismiss logic
│   │   └── signature-utils.ts                # Signature PNG storage helpers
│   └── pdf/
│       └── inspection-pdf.tsx                # PDF generation (like work-order-pdf.tsx)
└── types/
    └── inspections.ts                        # Inspection, Template, Defect types
```

### Pattern 1: Inspection Template with Trade-Specific Checklists
**What:** Pre-defined inspection templates per trade (Gewerk) with grouped checklist items
**When to use:** Template creation (admin), inspection creation (auto-populate from template)
**Example:**
```typescript
// Database schema pattern (follows quality gate checklist JSONB pattern)

CREATE TYPE inspection_formality AS ENUM (
  'informal_check',       -- Informeller Check
  'formal_abnahme'        -- Formales Abnahmeprotokoll
);

CREATE TABLE inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trade_category trade_category NOT NULL,      -- Links to existing trade enum
  formality_level inspection_formality NOT NULL DEFAULT 'informal_check',

  -- Checklist structure (JSONB like quality gates)
  checklist_sections JSONB NOT NULL DEFAULT '[]',  -- [{id, name, items: [{id, title, description}]}]

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist sections structure:
-- [
--   {
--     "id": "uuid",
--     "name": "Oberflächen",
--     "items": [
--       {"id": "uuid", "title": "Wandanstrich gleichmäßig", "description": "Keine Streifen oder Flecken"},
--       {"id": "uuid", "title": "Bodenbelag fugenlos", "description": "Keine sichtbaren Übergänge"}
--     ]
--   },
--   {
--     "id": "uuid",
--     "name": "Anschlüsse",
--     "items": [...]
--   }
-- ]

COMMENT ON COLUMN inspection_templates.checklist_sections IS 'JSONB array of sections with items: [{id, name, items: [{id, title, description}]}]';
COMMENT ON COLUMN inspection_templates.formality_level IS 'informal_check = quick check, formal_abnahme = legal weight with signatures';
```

### Pattern 2: Defect Management with Independent Lifecycle
**What:** Defects with severity classification and independent status tracking
**When to use:** During inspection execution (flag defects), post-inspection review (decide actions)
**Example:**
```typescript
// Database schema

CREATE TYPE defect_severity AS ENUM (
  'gering',     -- Minor: cosmetic, does not affect functionality
  'mittel',     -- Major: affects functionality but usable
  'schwer'      -- Critical: must fix before acceptance
);

CREATE TYPE defect_status AS ENUM (
  'open',
  'in_progress',
  'resolved'
);

CREATE TABLE inspection_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,

  -- Linked to checklist item (if defect originated from failed item)
  checklist_item_id TEXT,  -- References item ID in inspection.checklist_items JSONB

  -- Defect details
  title TEXT NOT NULL,
  description TEXT,
  severity defect_severity NOT NULL,

  -- Independent lifecycle (NOT derived from task)
  status defect_status NOT NULL DEFAULT 'open',

  -- Action taken after review
  action TEXT,  -- 'task_created' | 'deferred' | 'dismissed' | null
  action_reason TEXT,  -- Required for 'dismissed', optional for others
  linked_task_id UUID REFERENCES tasks(id),  -- If action = 'task_created'

  -- Photos stored in inspections bucket
  photo_storage_paths TEXT[] DEFAULT '{}',  -- Array of paths in inspections bucket

  -- Tracking
  created_by UUID REFERENCES users(id),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspection_defects_inspection ON inspection_defects(inspection_id);
CREATE INDEX idx_inspection_defects_severity ON inspection_defects(severity);
CREATE INDEX idx_inspection_defects_status ON inspection_defects(status);

COMMENT ON COLUMN inspection_defects.checklist_item_id IS 'Links to item in inspection.checklist_items JSONB (if defect from failed item)';
COMMENT ON COLUMN inspection_defects.status IS 'Independent lifecycle - not derived from linked task status';
COMMENT ON COLUMN inspection_defects.action IS 'Post-review action: task_created, deferred to next inspection, or dismissed';
```

### Pattern 3: Digital Signature Capture with Canvas + Typed Name
**What:** Capture contractor signature with canvas drawing AND typed name identification
**When to use:** Inspection completion (after defect review, before PDF generation)
**Example:**
```typescript
// Source: Context7 /agilgur5/react-signature-canvas + KEWA customization
import React, { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

interface SignatureCaptureProps {
  onSave: (signatureData: { imageDataUrl: string; signerName: string }) => Promise<void>
}

export function SignatureCapture({ onSave }: SignatureCaptureProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [signerName, setSignerName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const clearSignature = () => {
    sigCanvas.current?.clear()
  }

  const saveSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      alert('Bitte unterschreiben Sie')
      return
    }
    if (!signerName.trim()) {
      alert('Bitte geben Sie Ihren Namen ein')
      return
    }

    setIsSaving(true)
    try {
      // Get signature as data URL (PNG)
      const imageDataUrl = sigCanvas.current.toDataURL('image/png')

      await onSave({ imageDataUrl, signerName: signerName.trim() })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-gray-50">
        <label className="block text-sm font-medium mb-2">
          Unterschrift (bitte hier zeichnen)
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded bg-white">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              width: 500,
              height: 200,
              className: 'signature-canvas'
            }}
            penColor="black"
          />
        </div>
        <button
          onClick={clearSignature}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Löschen
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Name (getippt zur Identifikation)
        </label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Max Mustermann"
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <button
        onClick={saveSignature}
        disabled={isSaving}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isSaving ? 'Speichern...' : 'Unterschrift speichern'}
      </button>
    </div>
  )
}
```

### Pattern 4: Inspection Entity with Status Workflow
**What:** Main inspection entity linking to work order/project with status workflow
**When to use:** Inspection creation, execution, completion
**Example:**
```typescript
// Database schema

CREATE TYPE inspection_status AS ENUM (
  'in_progress',  -- Inspector filling checklist
  'completed',    -- All items checked, ready for signature
  'signed'        -- Contractor signed (final state)
);

CREATE TYPE inspection_result AS ENUM (
  'passed',
  'passed_with_conditions',  -- Passed but with minor defects to fix
  'failed'
);

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  work_order_id UUID REFERENCES work_orders(id),
  project_id UUID REFERENCES renovation_projects(id),
  template_id UUID REFERENCES inspection_templates(id),  -- Template used

  -- Inspection metadata
  title TEXT NOT NULL,
  description TEXT,
  inspector_id UUID NOT NULL REFERENCES users(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Status workflow
  status inspection_status NOT NULL DEFAULT 'in_progress',

  -- Checklist (JSONB, copied from template at creation, editable)
  checklist_items JSONB NOT NULL DEFAULT '[]',  -- Same structure as template sections

  -- Results (filled during execution)
  overall_result inspection_result,
  notes TEXT,  -- Inspector summary notes

  -- Signature (captured at completion)
  signature_storage_path TEXT,  -- PNG in inspections bucket
  signer_name TEXT,
  signer_role TEXT,  -- e.g., "Handwerker", "Baumeister"
  signed_at TIMESTAMPTZ,

  -- Completion tracking
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either work_order_id or project_id must be set
  CHECK (work_order_id IS NOT NULL OR project_id IS NOT NULL)
);

CREATE INDEX idx_inspections_work_order ON inspections(work_order_id);
CREATE INDEX idx_inspections_project ON inspections(project_id);
CREATE INDEX idx_inspections_template ON inspections(template_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_inspector ON inspections(inspector_id);

-- Status transition trigger (similar to change orders)
CREATE OR REPLACE FUNCTION validate_inspection_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "in_progress": ["completed"],
    "completed": ["signed"],
    "signed": []
  }'::JSONB;
BEGIN
  IF OLD.status IS NOT NULL AND NEW.status != OLD.status THEN
    IF NOT (valid_transitions->OLD.status ? NEW.status::TEXT) THEN
      RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;

  -- Require signature data when transitioning to 'signed'
  IF NEW.status = 'signed' AND (NEW.signature_storage_path IS NULL OR NEW.signer_name IS NULL) THEN
    RAISE EXCEPTION 'Signature data required when marking as signed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inspection_status_transition_check
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_inspection_status_transition();

COMMENT ON TABLE inspections IS 'Construction inspections with checklists and defect tracking';
COMMENT ON COLUMN inspections.checklist_items IS 'JSONB copied from template at creation, editable post-creation';
COMMENT ON COLUMN inspections.overall_result IS 'Set at completion based on defect severity and count';
COMMENT ON COLUMN inspections.signature_storage_path IS 'PNG stored at inspections/{id}/signature.png';
```

### Anti-Patterns to Avoid

- **Storing signature as base64 in database:** Store as PNG file in dedicated inspections bucket. Database only stores path. Base64 bloats database and query performance.

- **Deriving defect status from linked task:** Defect lifecycle is independent. A defect can be "resolved" even if linked task is still in progress (contractor fixed it, inspector verified).

- **Non-editable checklists after creation:** Templates are starting points. Inspector must be able to add/remove/reorder items for specific inspection context.

- **Blocking completion with defects:** Warn but allow. System warns about open defects but inspector acknowledges and completes anyway (real-world workflow).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signature capture canvas | Custom canvas drawing logic | react-signature-canvas | Handles touch/mouse/pen input, exports PNG/JPG/SVG, undo/redo, 362+ projects use it |
| Photo upload with preview | Custom file input + preview | Reuse PhotoEvidenceUpload from change orders | Already implemented, tested, supports multi-upload |
| PDF generation | Manual PDF bytes assembly | @react-pdf/renderer (existing) | Already in stack for work orders/change orders, React-native syntax |
| Defect severity colors | Hardcoded color classes | Badge component with severity mapping | Consistent with existing status badges, centralized styling |
| Storage signed URLs | Manual URL generation | Supabase storage.createSignedUrl() | Same pattern as knowledge base attachments, 1-hour expiry |

**Key insight:** Construction inspection is essentially checklist execution + defect tracking + signature capture. All three components have proven patterns in the codebase (quality gates for checklists, status workflow for defects, canvas libraries for signatures). Don't reinvent — extend existing patterns.

## Common Pitfalls

### Pitfall 1: Template vs. Instance Confusion
**What goes wrong:** Mixing template modification with instance execution. User edits template thinking they're editing current inspection checklist.
**Why it happens:** Templates and instances use same checklist structure (JSONB sections). UI looks similar.
**How to avoid:** Clear visual distinction. Templates in admin section (Vorlagen), instances in inspection section (Abnahmen). Inspection creation copies template to instance — changes to template don't affect existing inspections.
**Warning signs:** User reports "checklist changes disappeared" or "I changed the template but inspection didn't update"

### Pitfall 2: Signature Refusal Edge Case
**What goes wrong:** Inspection can't be completed because contractor refuses to sign. Inspector stuck.
**Why it happens:** Status workflow requires signature for 'signed' status. No escape hatch.
**How to avoid:** Inspector marks "Unterschrift verweigert" with mandatory reason field. Inspection completed without signature (overall_result can be set, but signature fields remain null). Documented refusal reason provides audit trail.
**Warning signs:** Inspector calls support asking "contractor won't sign, how do I finish inspection?"

### Pitfall 3: Defect Photo Nudge vs. Requirement
**What goes wrong:** System blocks defect creation without photo. Inspector annoyed when documenting obvious issues.
**Why it happens:** Developer assumes photos always needed, adds validation.
**How to avoid:** Photos optional with nudge only. System prompts "Möchten Sie ein Foto hinzufügen?" when no photo attached. Inspector can dismiss prompt. No validation error.
**Warning signs:** Inspector reports "can't log defect without photo" or skips defect logging entirely

### Pitfall 4: Checklist Item Photo Storage Confusion
**What goes wrong:** Checklist item photos stored in wrong bucket (media bucket instead of inspections bucket).
**Why it happens:** Developer sees existing media bucket, reuses it. Doesn't check Phase 22 context decision.
**How to avoid:** Dedicated inspections bucket for ALL inspection-related photos (checklist items, defects, signatures). Path pattern: `inspections/{inspection_id}/items/{uuid}.webp`, `inspections/{inspection_id}/defects/{uuid}.webp`. Clear separation from general media.
**Warning signs:** Permission errors when accessing inspection photos, or lifecycle cleanup issues

### Pitfall 5: Defect Action Ambiguity
**What goes wrong:** User creates task from defect, then tries to create another task from same defect. Duplicate tasks created.
**Why it happens:** No tracking of which defects already have tasks created.
**How to avoid:** `action` field on defects tracks action taken: 'task_created' | 'deferred' | 'dismissed' | null. Once action set, UI shows current action and prevents re-action. User can change action (e.g., dismissed → task_created) but clear state tracking prevents confusion.
**Warning signs:** Duplicate tasks being created, user reports "I already created a task for this"

## Code Examples

Verified patterns from official sources:

### Signature Capture Component Setup
```typescript
// Source: Context7 /agilgur5/react-signature-canvas
import React, { useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'

function MyApp() {
  const sigCanvas = useRef<SignatureCanvas>(null)

  // Clear signature
  const clear = () => sigCanvas.current?.clear()

  // Check if empty
  const isEmpty = () => sigCanvas.current?.isEmpty()

  // Get signature as PNG data URL
  const getSignature = () => sigCanvas.current?.toDataURL('image/png')

  // Get signature as JPEG (with background color)
  const getSignatureJPG = () => sigCanvas.current?.toDataURL('image/jpeg', 0.9)

  return (
    <div>
      <SignatureCanvas
        ref={sigCanvas}
        penColor='black'
        canvasProps={{
          width: 500,
          height: 200,
          className: 'sigCanvas'
        }}
      />
      <button onClick={clear}>Clear</button>
    </div>
  )
}
```

### Defect Severity Badge Component
```typescript
// Consistent with existing status badge patterns
import React from 'react'
import type { DefectSeverity } from '@/types/inspections'

interface SeverityBadgeProps {
  severity: DefectSeverity
}

const SEVERITY_CONFIG = {
  gering: { label: 'Gering', color: 'bg-yellow-100 text-yellow-800' },
  mittel: { label: 'Mittel', color: 'bg-orange-100 text-orange-800' },
  schwer: { label: 'Schwer', color: 'bg-red-100 text-red-800' },
} as const

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity]

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
```

### Checklist Item Execution Component
```typescript
// Pass/Fail/NA result tracking per item
import React, { useState } from 'react'
import type { ChecklistItem, ChecklistItemResult } from '@/types/inspections'

interface ChecklistItemCardProps {
  item: ChecklistItem
  result: ChecklistItemResult | null
  onResultChange: (result: ChecklistItemResult) => void
  onPhotoAdd: () => void
}

export function ChecklistItemCard({
  item,
  result,
  onResultChange,
  onPhotoAdd
}: ChecklistItemCardProps) {
  const [notes, setNotes] = useState(result?.notes || '')

  const updateResult = (status: 'pass' | 'fail' | 'na') => {
    onResultChange({
      item_id: item.id,
      status,
      notes: notes || null,
      checked_at: new Date().toISOString()
    })
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div>
        <h4 className="font-medium">{item.title}</h4>
        {item.description && (
          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
        )}
      </div>

      {/* Result buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => updateResult('pass')}
          className={`px-3 py-1 rounded ${result?.status === 'pass' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          ✓ Pass
        </button>
        <button
          onClick={() => updateResult('fail')}
          className={`px-3 py-1 rounded ${result?.status === 'fail' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
        >
          ✗ Fail
        </button>
        <button
          onClick={() => updateResult('na')}
          className={`px-3 py-1 rounded ${result?.status === 'na' ? 'bg-gray-600 text-white' : 'bg-gray-200'}`}
        >
          N/A
        </button>
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notizen (optional)"
        className="w-full px-3 py-2 border rounded-lg text-sm"
        rows={2}
      />

      {/* Photo button */}
      <button
        onClick={onPhotoAdd}
        className="text-sm text-blue-600 hover:underline"
      >
        + Foto hinzufügen
      </button>
    </div>
  )
}
```

### Defect Action Review Component
```typescript
// Post-inspection defect review with action selection
import React, { useState } from 'react'
import type { InspectionDefect } from '@/types/inspections'

interface DefectReviewCardProps {
  defect: InspectionDefect
  onActionTaken: (defectId: string, action: 'task_created' | 'deferred' | 'dismissed', reason?: string) => Promise<void>
}

export function DefectReviewCard({ defect, onActionTaken }: DefectReviewCardProps) {
  const [selectedAction, setSelectedAction] = useState<'task_created' | 'deferred' | 'dismissed' | null>(null)
  const [reason, setReason] = useState('')

  const handleSubmit = async () => {
    if (!selectedAction) return
    if (selectedAction === 'dismissed' && !reason.trim()) {
      alert('Bitte geben Sie einen Grund für die Ablehnung an')
      return
    }

    await onActionTaken(defect.id, selectedAction, reason || undefined)
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">{defect.title}</h4>
          <p className="text-sm text-gray-600">{defect.description}</p>
        </div>
        <SeverityBadge severity={defect.severity} />
      </div>

      {/* Action selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Aktion wählen:</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`action-${defect.id}`}
              checked={selectedAction === 'task_created'}
              onChange={() => setSelectedAction('task_created')}
            />
            <span className="text-sm">Aufgabe erstellen</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`action-${defect.id}`}
              checked={selectedAction === 'deferred'}
              onChange={() => setSelectedAction('deferred')}
            />
            <span className="text-sm">Auf nächste Abnahme verschieben</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`action-${defect.id}`}
              checked={selectedAction === 'dismissed'}
              onChange={() => setSelectedAction('dismissed')}
            />
            <span className="text-sm">Verwerfen</span>
          </label>
        </div>
      </div>

      {/* Reason field (required for dismissed) */}
      {selectedAction && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Begründung {selectedAction === 'dismissed' && '(erforderlich)'}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Grund für diese Aktion..."
            className="w-full px-3 py-2 border rounded-lg text-sm"
            rows={2}
            required={selectedAction === 'dismissed'}
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selectedAction}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        Aktion ausführen
      </button>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Paper checklists | Digital checklists with JSONB storage | 2026 standard | Editable, searchable, version controlled |
| Wet signatures | Canvas-based digital signatures | react-signature-canvas v2.0+ (2020+) | Legal validity, faster processing, no scanning |
| Defect tracking in spreadsheets | Database-driven defect lifecycle | Industry standard 2024+ | Independent status, photo evidence, task linking |
| Single media bucket | Dedicated inspections bucket | KEWA Phase 22 decision | Cleaner lifecycle management, better permissions |
| Critical/Major/Minor (English) | Schwer/Mittel/Gering (German) | TIC industry standard 2025+ | Swiss market terminology alignment |

**Deprecated/outdated:**
- **Scanned paper protocols:** Digital PDF generation with embedded signatures replaces physical document scanning
- **Severity levels: High/Medium/Low:** Use construction-specific Critical/Major/Minor (Schwer/Mittel/Gering)
- **Global media bucket for all contexts:** Dedicated buckets per feature domain (inspections, kb_articles, etc.)

## Open Questions

Things that couldn't be fully resolved:

1. **Magic Link Portal for Remote Signatures**
   - What we know: Phase 22 context mentions "portal link (like change order magic link) as fallback for remote sign-off"
   - What's unclear: Full implementation details deferred to Phase 23 (Inspection Advanced)
   - Recommendation: Phase 22 implements in-person signature only (inspector's device). Remote signature portal is Phase 23 scope. Prepare schema to support both (portal signature path vs. in-person signature path).

2. **Re-inspection Scheduling and Parent-Child Tracking**
   - What we know: Phase 22 context explicitly defers this to Phase 23
   - What's unclear: Exact linking mechanism between original inspection and re-inspection
   - Recommendation: Add `parent_inspection_id UUID REFERENCES inspections(id)` field to inspections table now (nullable, unused in Phase 22). Phase 23 can use it without migration.

3. **Defect Resolution Verification**
   - What we know: Defect has status 'resolved' but Phase 22 doesn't specify verification workflow
   - What's unclear: Who marks as resolved? Inspector only? Or contractor can mark resolved and inspector verifies?
   - Recommendation: Phase 22 keeps it simple — inspector marks as resolved after visual verification. Phase 23 can add contractor self-service resolution with inspector approval if needed.

## Sources

### Primary (HIGH confidence)
- Context7 /agilgur5/react-signature-canvas - Signature capture API and examples
- Existing codebase patterns:
  - C:\Dev\KeWa-App\supabase\migrations\032_templates.sql - Quality gate checklist JSONB pattern
  - C:\Dev\KeWa-App\supabase\migrations\035_project_from_template.sql - Runtime quality gate tracking
  - C:\Dev\KeWa-App\src\lib\pdf\change-order-pdf.tsx - PDF generation pattern
  - C:\Dev\KeWa-App\supabase\setup_storage.md - Storage bucket patterns and signed URLs
  - C:\Dev\KeWa-App\.planning\phases\21-change-orders\21-RESEARCH.md - Status workflow patterns

### Secondary (MEDIUM confidence)
- [react-signature-canvas npm](https://www.npmjs.com/package/react-signature-canvas) - Usage statistics, version info
- [Common Ninja's Blog - Digital Signature Pad in React](https://www.commoninja.com/blog/how-to-build-a-digital-signature-pad-in-react) - Implementation guidance
- [How to Implement Proactive Snagging Approach - PMWeb](https://pmweb.com/how-to-implement-proactive-snagging-approach-to-identify-defects-and-omissions-on-construction-projects/) - Defect management workflow
- [How to effectively manage construction defects with a snag list - PlanRadar](https://www.planradar.com/ae-en/how-to-manage-construction-defect-with-snag-list/) - Defect categorization

### Tertiary (LOW confidence)
- [Top 5 Construction Inspection Software Solutions - Fluix](https://fluix.io/blog/best-construction-inspection-software) - General feature list
- [Electrical Trim-Out Checklist - ServiceTitan](https://www.servicetitan.com/templates/electrician/trim-out-checklist) - Trade-specific checklist examples
- [Skilled Trades Project Checklist: Plumbing - NYC Buildings](https://www.nyc.gov/site/buildings/industry/project-checklists-skilled-trades-plumbing.page) - Plumber-specific checklist structure
- [3 Types of Quality Defects - HQTS](https://www.hqts.com/aql-quality-defects/) - Defect severity classification (Critical/Major/Minor)
- [Defect Severity and Priority in Testing - Software Testing Help](https://www.softwaretestinghelp.com/how-to-set-defect-priority-and-severity-with-defect-triage-process/) - Severity vs. priority distinction

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified in Context7 or existing codebase
- Architecture: HIGH - Extends proven patterns (quality gates, status workflow, PDF generation, storage)
- Pitfalls: MEDIUM - Based on general construction inspection experience + existing codebase edge cases

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable domain, slow-moving construction industry standards)
