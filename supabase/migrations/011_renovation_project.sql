-- KEWA Renovations Operations System
-- Migration: 011_renovation_project.sql
-- DATA-06: RenovationProject entity with workflow status

-- =============================================
-- RENOVATION STATUS ENUM
-- =============================================

-- Full workflow status for renovation projects
CREATE TYPE renovation_status AS ENUM (
  'planned',
  'active',
  'blocked',
  'finished',
  'approved'
);

-- =============================================
-- RENOVATION PROJECTS TABLE
-- =============================================

-- Enhanced project type for renovations with full workflow support
CREATE TABLE IF NOT EXISTS renovation_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  unit_id UUID NOT NULL REFERENCES units(id),
  template_id UUID,  -- Will link to templates (Phase 8)

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  status renovation_status DEFAULT 'planned',

  -- Scheduling
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,

  -- Budget
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),

  -- Approval workflow
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  -- Visibility (preserve v1 pattern)
  visible_to_imeri BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_renovation_projects_unit_id ON renovation_projects(unit_id);
CREATE INDEX IF NOT EXISTS idx_renovation_projects_status ON renovation_projects(status);
CREATE INDEX IF NOT EXISTS idx_renovation_projects_template_id ON renovation_projects(template_id);
CREATE INDEX IF NOT EXISTS idx_renovation_projects_created_by ON renovation_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_renovation_projects_dates ON renovation_projects(planned_start_date, planned_end_date);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS renovation_projects_updated_at ON renovation_projects;
CREATE TRIGGER renovation_projects_updated_at
  BEFORE UPDATE ON renovation_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- LINK ROOMS TO RENOVATION PROJECTS
-- =============================================

-- Add source project reference for room condition updates
ALTER TABLE rooms
ADD CONSTRAINT fk_rooms_condition_source
FOREIGN KEY (condition_source_project_id) REFERENCES renovation_projects(id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE renovation_projects IS 'Enhanced renovation project with full workflow support';
COMMENT ON COLUMN renovation_projects.template_id IS 'Reference to template (Phase 8)';
COMMENT ON COLUMN renovation_projects.status IS 'Workflow status: planned -> active -> blocked/finished -> approved';
COMMENT ON COLUMN renovation_projects.estimated_cost IS 'Initial cost estimate in CHF';
COMMENT ON COLUMN renovation_projects.actual_cost IS 'Actual total cost after completion';
COMMENT ON COLUMN renovation_projects.approved_by IS 'User who approved the project completion';
COMMENT ON COLUMN renovation_projects.visible_to_imeri IS 'Whether project is visible to Imeri (preserves v1 pattern)';
