-- KEWA Renovations Operations System
-- Migration: 057_change_orders.sql
-- Purpose: Change Orders for in-flight project modifications
-- Phase: 21-change-orders, Plan: 01

-- =============================================
-- STATUS ENUMS
-- =============================================

DO $$ BEGIN
  CREATE TYPE change_order_status AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE change_order_reason AS ENUM (
    'owner_request',
    'unforeseen_conditions',
    'design_error',
    'site_conditions',
    'regulatory_requirement',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- SEQUENCE FOR CO NUMBERS
-- =============================================

CREATE SEQUENCE IF NOT EXISTS change_order_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

-- =============================================
-- CHANGE ORDERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order identification
  co_number TEXT UNIQUE NOT NULL,

  -- Relationships
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  related_work_order_ids UUID[] DEFAULT '{}',

  -- Version tracking
  version INTEGER DEFAULT 1,

  -- Description and reason
  description TEXT NOT NULL,
  reason_category change_order_reason NOT NULL,
  reason_details TEXT,

  -- Line items (JSONB array like purchase orders)
  line_items JSONB DEFAULT '[]',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Schedule impact (days added or removed)
  schedule_impact_days INTEGER DEFAULT 0,

  -- Status workflow
  status change_order_status DEFAULT 'draft',

  -- Tracking
  created_by UUID REFERENCES users(id),
  creator_type TEXT NOT NULL DEFAULT 'internal' CHECK (creator_type IN ('internal', 'contractor')),
  current_approver_id UUID REFERENCES users(id),

  -- Client portal visibility
  show_line_items_to_client BOOLEAN DEFAULT true,

  -- Status timestamps (auto-set by trigger)
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Cancellation reason
  cancelled_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- VERSION HISTORY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS change_order_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  description TEXT NOT NULL,
  line_items JSONB NOT NULL,
  total_amount DECIMAL(12,2),
  schedule_impact_days INTEGER,
  revised_by UUID REFERENCES users(id),
  revised_at TIMESTAMPTZ DEFAULT NOW(),
  revision_reason TEXT,
  UNIQUE(change_order_id, version)
);

-- =============================================
-- PHOTOS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS change_order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  caption TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- APPROVAL THRESHOLDS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS approval_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES renovation_projects(id) ON DELETE CASCADE,
  min_amount DECIMAL(12,2),
  max_amount DECIMAL(12,2),
  approver_role TEXT NOT NULL CHECK (approver_role IN ('property_manager', 'finance_director', 'ceo')),
  requires_client_approval BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CO NUMBER GENERATOR
-- =============================================

CREATE OR REPLACE FUNCTION generate_change_order_number(p_year INTEGER DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  use_year INTEGER;
  seq_val BIGINT;
BEGIN
  use_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  seq_val := nextval('change_order_seq');
  RETURN 'CO-' || use_year || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STATUS TRANSITION VALIDATION
-- =============================================

CREATE OR REPLACE FUNCTION validate_change_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "draft": ["submitted", "cancelled"],
    "submitted": ["under_review", "cancelled"],
    "under_review": ["approved", "rejected", "submitted", "cancelled"],
    "approved": ["cancelled"],
    "rejected": [],
    "cancelled": []
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

  -- Auto-set timestamps based on status
  CASE NEW.status
    WHEN 'submitted' THEN
      NEW.submitted_at = NOW();
    WHEN 'approved' THEN
      NEW.approved_at = NOW();
    WHEN 'rejected' THEN
      NEW.rejected_at = NOW();
    WHEN 'cancelled' THEN
      NEW.cancelled_at = NOW();
    ELSE
      -- No special handling for draft or under_review
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status transitions
DROP TRIGGER IF EXISTS change_orders_status_transition ON change_orders;
CREATE TRIGGER change_orders_status_transition
  BEFORE UPDATE OF status ON change_orders
  FOR EACH ROW EXECUTE FUNCTION validate_change_order_status_transition();

-- =============================================
-- VERSION HISTORY TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION change_order_version_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.version < NEW.version) THEN
    -- Store OLD values in version history
    INSERT INTO change_order_versions (
      change_order_id, version, description, line_items,
      total_amount, schedule_impact_days, revised_by, revision_reason
    ) VALUES (
      OLD.id, OLD.version, OLD.description, OLD.line_items,
      OLD.total_amount, OLD.schedule_impact_days,
      NEW.current_approver_id, NEW.reason_details
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS change_orders_versioning ON change_orders;
CREATE TRIGGER change_orders_versioning
  AFTER UPDATE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION change_order_version_trigger();

-- =============================================
-- AUDIT LOG TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION log_change_order_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM create_audit_log(
      'change_orders',
      NEW.id,
      'update'::audit_action,
      NEW.current_approver_id,
      NULL,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'reason', NEW.reason_details)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS change_orders_audit ON change_orders;
CREATE TRIGGER change_orders_audit
  AFTER UPDATE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION log_change_order_audit();

-- =============================================
-- PREVENT WORK ORDER DELETION WITH ACTIVE COs
-- =============================================

CREATE OR REPLACE FUNCTION prevent_work_order_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM change_orders
    WHERE work_order_id = OLD.id
      AND status IN ('submitted', 'under_review', 'approved')
  ) THEN
    RAISE EXCEPTION 'Cannot delete work order with active change orders';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_work_order_deletion ON work_orders;
CREATE TRIGGER check_work_order_deletion
  BEFORE DELETE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION prevent_work_order_deletion();

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS change_orders_updated_at ON change_orders;
CREATE TRIGGER change_orders_updated_at
  BEFORE UPDATE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS approval_thresholds_updated_at ON approval_thresholds;
CREATE TRIGGER approval_thresholds_updated_at
  BEFORE UPDATE ON approval_thresholds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_change_orders_work_order ON change_orders(work_order_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status ON change_orders(status);
CREATE INDEX IF NOT EXISTS idx_change_orders_created_at ON change_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_order_versions_lookup ON change_order_versions(change_order_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_change_order_photos_co ON change_order_photos(change_order_id);
CREATE INDEX IF NOT EXISTS idx_approval_thresholds_project ON approval_thresholds(project_id);

-- =============================================
-- SEED DEFAULT APPROVAL THRESHOLDS
-- =============================================

INSERT INTO approval_thresholds (project_id, min_amount, max_amount, approver_role, priority)
VALUES
  (NULL, NULL, 5000, 'property_manager', 1),
  (NULL, 5000, 25000, 'finance_director', 2),
  (NULL, 25000, NULL, 'ceo', 3)
ON CONFLICT DO NOTHING;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE change_orders IS 'Change orders for in-flight project modifications with versioning and approval workflow';
COMMENT ON COLUMN change_orders.co_number IS 'Generated change order number: CO-YYYY-NNNNN';
COMMENT ON COLUMN change_orders.work_order_id IS 'Primary work order affected by this change';
COMMENT ON COLUMN change_orders.related_work_order_ids IS 'Additional work orders affected by this change';
COMMENT ON COLUMN change_orders.version IS 'Current version number (incremented with each revision/counter-offer)';
COMMENT ON COLUMN change_orders.line_items IS 'JSONB array: [{id, description, quantity, unit, unit_price, total}] - can be positive (additions) or negative (credits)';
COMMENT ON COLUMN change_orders.total_amount IS 'Total change order amount (can be positive or negative)';
COMMENT ON COLUMN change_orders.schedule_impact_days IS 'Days added to schedule (positive) or removed (negative)';
COMMENT ON COLUMN change_orders.creator_type IS 'Who initiated the CO: internal staff or contractor';
COMMENT ON COLUMN change_orders.show_line_items_to_client IS 'Whether to show detailed line items in client portal (false = summary only)';

COMMENT ON TABLE change_order_versions IS 'Version history for change orders (counter-offers create new versions)';
COMMENT ON COLUMN change_order_versions.revision_reason IS 'Reason for creating this revision';

COMMENT ON TABLE change_order_photos IS 'Photo evidence attached to change orders';
COMMENT ON COLUMN change_order_photos.storage_path IS 'Path in media bucket: change_orders/{co_id}/photos/{filename}';

COMMENT ON TABLE approval_thresholds IS 'Configurable approval routing thresholds by dollar amount';
COMMENT ON COLUMN approval_thresholds.project_id IS 'Project-specific override (NULL = global default)';
COMMENT ON COLUMN approval_thresholds.requires_client_approval IS 'Whether client approval is required via magic link portal';
COMMENT ON COLUMN approval_thresholds.priority IS 'Lower number = higher priority when ranges overlap';

COMMENT ON FUNCTION generate_change_order_number IS 'Generates change order number: CO-YYYY-NNNNN using sequence';
COMMENT ON FUNCTION validate_change_order_status_transition IS 'Enforces valid status transitions and auto-sets timestamps';
COMMENT ON FUNCTION change_order_version_trigger IS 'Stores previous version in history table when version incremented';
COMMENT ON FUNCTION log_change_order_audit IS 'Logs status changes to audit_logs table';
COMMENT ON FUNCTION prevent_work_order_deletion IS 'Prevents deletion of work orders with active change orders';
