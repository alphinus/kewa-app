-- KEWA Renovations Operations System
-- Migration: 035_project_from_template.sql
-- Runtime project hierarchy and template application

-- =============================================
-- PROJECT PHASES (runtime WBS Level 1)
-- =============================================

CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES renovation_projects(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  wbs_code TEXT NOT NULL,

  -- Scheduling
  estimated_duration_days INTEGER,
  actual_duration_days INTEGER,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),

  -- Template reference
  source_template_phase_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, wbs_code)
);

-- Indexes
CREATE INDEX idx_project_phases_project ON project_phases(project_id);
CREATE INDEX idx_project_phases_status ON project_phases(status);

-- Timestamp trigger
CREATE TRIGGER project_phases_updated_at
  BEFORE UPDATE ON project_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- PROJECT PACKAGES (runtime WBS Level 2)
-- =============================================

CREATE TABLE project_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  wbs_code TEXT NOT NULL,

  -- Trade association
  trade_category trade_category,

  -- Scheduling & Cost
  estimated_duration_days INTEGER,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),

  -- Template reference
  source_template_package_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(phase_id, wbs_code)
);

-- Indexes
CREATE INDEX idx_project_packages_phase ON project_packages(phase_id);
CREATE INDEX idx_project_packages_status ON project_packages(status);

-- Timestamp trigger
CREATE TRIGGER project_packages_updated_at
  BEFORE UPDATE ON project_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- PROJECT TASKS EXTENSION (link to package)
-- =============================================

-- Add package link and WBS fields to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES project_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS wbs_code TEXT,
ADD COLUMN IF NOT EXISTS is_from_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source_template_task_id UUID;

-- Index for package lookup
CREATE INDEX IF NOT EXISTS idx_tasks_package_id ON tasks(package_id);
CREATE INDEX IF NOT EXISTS idx_tasks_wbs_code ON tasks(wbs_code) WHERE wbs_code IS NOT NULL;

-- =============================================
-- PROJECT QUALITY GATES (runtime gates)
-- =============================================

CREATE TABLE project_quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES renovation_projects(id) ON DELETE CASCADE,

  -- Gate location
  gate_level gate_level NOT NULL,
  phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
  package_id UUID REFERENCES project_packages(id) ON DELETE CASCADE,

  -- Gate definition
  name TEXT NOT NULL,
  description TEXT,

  -- Evidence requirements
  checklist_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  checklist_progress JSONB DEFAULT '[]'::JSONB,  -- Runtime progress
  min_photos_required INTEGER DEFAULT 0,
  photo_types JSONB DEFAULT '["completion"]'::JSONB,

  -- Behavior
  is_blocking BOOLEAN DEFAULT false,
  auto_approve_when_complete BOOLEAN DEFAULT true,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),

  -- Template reference
  source_template_gate_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure gate is linked to exactly one entity
  CHECK(
    (gate_level = 'package' AND package_id IS NOT NULL AND phase_id IS NULL) OR
    (gate_level = 'phase' AND phase_id IS NOT NULL AND package_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_project_quality_gates_project ON project_quality_gates(project_id);
CREATE INDEX idx_project_quality_gates_status ON project_quality_gates(status);

-- Timestamp trigger
CREATE TRIGGER project_quality_gates_updated_at
  BEFORE UPDATE ON project_quality_gates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE project_phases IS 'Runtime WBS Level 1: Major phases within a project';
COMMENT ON TABLE project_packages IS 'Runtime WBS Level 2: Work packages within phases';
COMMENT ON TABLE project_quality_gates IS 'Runtime quality gates for project milestones';
COMMENT ON COLUMN tasks.package_id IS 'Link to project package for WBS hierarchy';
COMMENT ON COLUMN tasks.wbs_code IS 'WBS code within project (e.g., 1.1.1)';
COMMENT ON COLUMN tasks.is_from_template IS 'True if task was created from template application';
