-- KEWA Renovations Operations System
-- Migration: 059_inspections.sql
-- Purpose: Inspection workflows with templates, checklists, defects, and signatures
-- Phase: 22-inspection-core, Plan: 01

-- =============================================
-- STATUS ENUMS
-- =============================================

DO $$ BEGIN
  CREATE TYPE inspection_formality AS ENUM (
    'informal_check',
    'formal_abnahme'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inspection_status AS ENUM (
    'in_progress',
    'completed',
    'signed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inspection_result AS ENUM (
    'passed',
    'passed_with_conditions',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE defect_severity AS ENUM (
    'gering',
    'mittel',
    'schwer'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE defect_status AS ENUM (
    'open',
    'in_progress',
    'resolved'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- INSPECTION TEMPLATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  trade_category trade_category NOT NULL,
  formality_level inspection_formality NOT NULL DEFAULT 'informal_check',

  -- Checklist structure (JSONB like quality gates)
  checklist_sections JSONB NOT NULL DEFAULT '[]',

  -- Lifecycle
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INSPECTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links (must have either work_order_id OR project_id)
  work_order_id UUID REFERENCES work_orders(id),
  project_id UUID REFERENCES renovation_projects(id),
  template_id UUID REFERENCES inspection_templates(id),

  -- Re-inspection linking (Phase 23 scope)
  parent_inspection_id UUID REFERENCES inspections(id),

  -- Inspection metadata
  title TEXT NOT NULL,
  description TEXT,
  inspector_id UUID NOT NULL REFERENCES users(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Status workflow
  status inspection_status NOT NULL DEFAULT 'in_progress',

  -- Checklist (JSONB, copied from template at creation, editable)
  checklist_items JSONB NOT NULL DEFAULT '[]',

  -- Results (filled during execution)
  overall_result inspection_result,
  notes TEXT,

  -- Signature (captured at completion)
  signature_storage_path TEXT,
  signer_name TEXT,
  signer_role TEXT,
  signed_at TIMESTAMPTZ,

  -- Signature refusal handling
  signature_refused BOOLEAN DEFAULT false,
  signature_refused_reason TEXT,

  -- Completion tracking
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either work_order_id or project_id must be set
  CHECK (work_order_id IS NOT NULL OR project_id IS NOT NULL)
);

-- =============================================
-- INSPECTION DEFECTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS inspection_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,

  -- Linked to checklist item (if defect originated from failed item)
  checklist_item_id TEXT,

  -- Defect details
  title TEXT NOT NULL,
  description TEXT,
  severity defect_severity NOT NULL,

  -- Independent lifecycle (NOT derived from task)
  status defect_status NOT NULL DEFAULT 'open',

  -- Action taken after review
  action TEXT CHECK (action IN ('task_created', 'deferred', 'dismissed')),
  action_reason TEXT,
  linked_task_id UUID REFERENCES tasks(id),

  -- Photos stored in inspections bucket
  photo_storage_paths TEXT[] DEFAULT '{}',

  -- Tracking
  created_by UUID REFERENCES users(id),
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STATUS TRANSITION VALIDATION
-- =============================================

CREATE OR REPLACE FUNCTION validate_inspection_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "in_progress": ["completed"],
    "completed": ["signed"],
    "signed": []
  }'::JSONB;
  allowed_next TEXT[];
BEGIN
  -- Skip if status not changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions
  allowed_next := ARRAY(SELECT jsonb_array_elements_text(valid_transitions->OLD.status::TEXT));

  -- Check if transition is valid
  IF NOT (NEW.status::TEXT = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %. Allowed: %',
      OLD.status, NEW.status, array_to_string(allowed_next, ', ');
  END IF;

  -- Require signature data when transitioning to 'signed' (unless refused)
  IF NEW.status = 'signed' THEN
    IF NEW.signature_refused = false AND (NEW.signature_storage_path IS NULL OR NEW.signer_name IS NULL) THEN
      RAISE EXCEPTION 'Signature data required when marking as signed (unless signature_refused is true)';
    END IF;
  END IF;

  -- Auto-set timestamps based on status
  CASE NEW.status
    WHEN 'completed' THEN
      NEW.completed_at = NOW();
    WHEN 'signed' THEN
      NEW.signed_at = NOW();
    ELSE
      -- No special handling for in_progress
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspection_status_transition_check ON inspections;
CREATE TRIGGER inspection_status_transition_check
  BEFORE UPDATE OF status ON inspections
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_inspection_status_transition();

-- =============================================
-- AUDIT LOG TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION log_inspection_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM create_audit_log(
      'inspections',
      NEW.id,
      'update'::audit_action,
      NEW.inspector_id,
      NULL,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'result', NEW.overall_result)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspections_audit ON inspections;
CREATE TRIGGER inspections_audit
  AFTER UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION log_inspection_audit();

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS inspection_templates_updated_at ON inspection_templates;
CREATE TRIGGER inspection_templates_updated_at
  BEFORE UPDATE ON inspection_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS inspections_updated_at ON inspections;
CREATE TRIGGER inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS inspection_defects_updated_at ON inspection_defects;
CREATE TRIGGER inspection_defects_updated_at
  BEFORE UPDATE ON inspection_defects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_inspections_work_order ON inspections(work_order_id);
CREATE INDEX IF NOT EXISTS idx_inspections_project ON inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_inspections_template ON inspections(template_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON inspections(inspector_id);

CREATE INDEX IF NOT EXISTS idx_inspection_defects_inspection ON inspection_defects(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_defects_severity ON inspection_defects(severity);
CREATE INDEX IF NOT EXISTS idx_inspection_defects_status ON inspection_defects(status);

CREATE INDEX IF NOT EXISTS idx_inspection_templates_trade ON inspection_templates(trade_category) WHERE is_active = true;

-- =============================================
-- STORAGE BUCKET SETUP
-- =============================================

-- Create inspections storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspections', 'inspections', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for inspections bucket (authenticated users only)
-- SELECT policy: Allow authenticated users to read
DO $$ BEGIN
  INSERT INTO storage.policies (name, bucket_id, definition)
  VALUES (
    'Authenticated users can view inspections',
    'inspections',
    '(auth.role() = ''authenticated'')'
  )
  ON CONFLICT (bucket_id, name) DO NOTHING;
EXCEPTION
  WHEN undefined_table THEN NULL; -- Skip if storage.policies table doesn't exist
END $$;

-- INSERT policy: Allow authenticated users to upload
DO $$ BEGIN
  INSERT INTO storage.policies (name, bucket_id, definition)
  VALUES (
    'Authenticated users can upload to inspections',
    'inspections',
    '(auth.role() = ''authenticated'')'
  )
  ON CONFLICT (bucket_id, name) DO NOTHING;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE inspection_templates IS 'Inspection templates with trade-specific checklists';
COMMENT ON COLUMN inspection_templates.checklist_sections IS 'JSONB array of sections with items: [{id, name, items: [{id, title, description}]}]';
COMMENT ON COLUMN inspection_templates.formality_level IS 'informal_check = quick check, formal_abnahme = legal weight with signatures';
COMMENT ON COLUMN inspection_templates.trade_category IS 'Links to existing trade enum from 014_partner.sql';

COMMENT ON TABLE inspections IS 'Construction inspections with checklists and defect tracking';
COMMENT ON COLUMN inspections.work_order_id IS 'Primary work order being inspected (nullable if project-level inspection)';
COMMENT ON COLUMN inspections.project_id IS 'Project being inspected (nullable if work order inspection)';
COMMENT ON COLUMN inspections.parent_inspection_id IS 'Links to original inspection for re-inspections (Phase 23 scope)';
COMMENT ON COLUMN inspections.checklist_items IS 'JSONB copied from template at creation, editable post-creation: [{section_id, name, items: [{item_id, status, notes, checked_at, photo_storage_paths}]}]';
COMMENT ON COLUMN inspections.overall_result IS 'Set at completion based on defect severity and count';
COMMENT ON COLUMN inspections.signature_storage_path IS 'PNG stored at inspections/{id}/signature.png';
COMMENT ON COLUMN inspections.signature_refused IS 'True if contractor refused to sign (with mandatory reason)';

COMMENT ON TABLE inspection_defects IS 'Defects logged during inspections with independent lifecycle';
COMMENT ON COLUMN inspection_defects.checklist_item_id IS 'Links to item in inspection.checklist_items JSONB (if defect from failed item)';
COMMENT ON COLUMN inspection_defects.status IS 'Independent lifecycle - not derived from linked task status';
COMMENT ON COLUMN inspection_defects.action IS 'Post-review action: task_created, deferred to next inspection, or dismissed';
COMMENT ON COLUMN inspection_defects.action_reason IS 'Required for dismissed action, optional for others';
COMMENT ON COLUMN inspection_defects.linked_task_id IS 'Reference to created task if action = task_created';
COMMENT ON COLUMN inspection_defects.photo_storage_paths IS 'Array of paths in inspections bucket: inspections/{inspection_id}/defects/{uuid}.webp';

COMMENT ON FUNCTION validate_inspection_status_transition IS 'Enforces valid status transitions and auto-sets timestamps. Allows signed status without signature if signature_refused=true';
COMMENT ON FUNCTION log_inspection_audit IS 'Logs status changes to audit_logs table';
