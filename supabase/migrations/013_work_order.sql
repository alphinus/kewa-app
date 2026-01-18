-- KEWA Renovations Operations System
-- Migration: 013_work_order.sql
-- DATA-08: WorkOrder entity for external contractor assignments

-- =============================================
-- WORK ORDER STATUS ENUM
-- =============================================

-- Full workflow status for work orders
CREATE TYPE work_order_status AS ENUM (
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'in_progress',
  'done',
  'inspected',
  'closed'
);

-- =============================================
-- WORK ORDERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  renovation_project_id UUID REFERENCES renovation_projects(id),
  task_id UUID REFERENCES tasks(id),
  room_id UUID REFERENCES rooms(id),
  partner_id UUID,  -- Will reference partners table (created in next migration)

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  scope_of_work TEXT,  -- Detailed work description for contractor

  -- Status workflow
  status work_order_status DEFAULT 'draft',

  -- Scheduling: Requested by KEWA
  requested_start_date DATE,
  requested_end_date DATE,

  -- Scheduling: Proposed by contractor
  proposed_start_date DATE,
  proposed_end_date DATE,

  -- Scheduling: Actual
  actual_start_date DATE,
  actual_end_date DATE,

  -- Magic link for external access (Phase 9)
  access_token UUID DEFAULT gen_random_uuid(),
  token_expires_at TIMESTAMPTZ,
  acceptance_deadline TIMESTAMPTZ,

  -- Status tracking timestamps
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Cost tracking
  estimated_cost DECIMAL(12,2),
  proposed_cost DECIMAL(12,2),  -- Contractor's price proposal
  final_cost DECIMAL(12,2),

  -- Notes (internal vs contractor visible)
  internal_notes TEXT,  -- KEWA only
  contractor_notes TEXT,  -- From contractor

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_work_orders_project_id ON work_orders(renovation_project_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_partner_id ON work_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_access_token ON work_orders(access_token);
CREATE INDEX IF NOT EXISTS idx_work_orders_task_id ON work_orders(task_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_dates ON work_orders(requested_start_date, requested_end_date);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS work_orders_updated_at ON work_orders;
CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE work_orders IS 'Work orders/tickets for external contractor assignments';
COMMENT ON COLUMN work_orders.scope_of_work IS 'Detailed work description for contractor';
COMMENT ON COLUMN work_orders.status IS 'Workflow: draft -> sent -> viewed -> accepted/rejected -> in_progress -> done -> inspected -> closed';
COMMENT ON COLUMN work_orders.access_token IS 'Magic link token for external contractor access (Phase 9)';
COMMENT ON COLUMN work_orders.proposed_cost IS 'Cost proposed by contractor in response';
COMMENT ON COLUMN work_orders.internal_notes IS 'Notes visible only to KEWA staff';
COMMENT ON COLUMN work_orders.contractor_notes IS 'Notes from contractor';
