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

-- =============================================
-- TEMPLATE APPLICATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION apply_template_to_project(
  p_template_id UUID,
  p_project_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_excluded_tasks UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE(
  phases_created INTEGER,
  packages_created INTEGER,
  tasks_created INTEGER,
  dependencies_created INTEGER,
  gates_created INTEGER
) AS $$
DECLARE
  v_id_mapping JSONB := '{}'::JSONB;
  v_phase RECORD;
  v_package RECORD;
  v_task RECORD;
  v_dep RECORD;
  v_gate RECORD;
  v_new_phase_id UUID;
  v_new_package_id UUID;
  v_new_task_id UUID;
  v_phases_created INTEGER := 0;
  v_packages_created INTEGER := 0;
  v_tasks_created INTEGER := 0;
  v_deps_created INTEGER := 0;
  v_gates_created INTEGER := 0;
  v_start DATE;
BEGIN
  -- Get start date (default to planned_start_date or today)
  SELECT COALESCE(p_start_date, planned_start_date, CURRENT_DATE)
  INTO v_start
  FROM renovation_projects
  WHERE id = p_project_id;

  -- =============================================
  -- CREATE PHASES
  -- =============================================
  FOR v_phase IN
    SELECT * FROM template_phases
    WHERE template_id = p_template_id
    ORDER BY sort_order
  LOOP
    v_new_phase_id := gen_random_uuid();

    INSERT INTO project_phases (
      id, project_id, name, description, wbs_code, sort_order,
      estimated_duration_days, status, source_template_phase_id
    ) VALUES (
      v_new_phase_id, p_project_id, v_phase.name, v_phase.description,
      v_phase.wbs_code, v_phase.sort_order, v_phase.estimated_duration_days,
      'pending', v_phase.id
    );

    -- Store mapping: template_phase_id -> project_phase_id
    v_id_mapping := v_id_mapping ||
      jsonb_build_object(v_phase.id::TEXT, v_new_phase_id::TEXT);

    v_phases_created := v_phases_created + 1;

    -- =============================================
    -- CREATE PACKAGES FOR THIS PHASE
    -- =============================================
    FOR v_package IN
      SELECT * FROM template_packages
      WHERE phase_id = v_phase.id
      ORDER BY sort_order
    LOOP
      v_new_package_id := gen_random_uuid();

      INSERT INTO project_packages (
        id, phase_id, name, description, wbs_code, sort_order,
        trade_category, estimated_duration_days, estimated_cost,
        status, source_template_package_id
      ) VALUES (
        v_new_package_id, v_new_phase_id, v_package.name, v_package.description,
        v_package.wbs_code, v_package.sort_order, v_package.trade_category,
        v_package.estimated_duration_days, v_package.estimated_cost,
        'pending', v_package.id
      );

      -- Store mapping
      v_id_mapping := v_id_mapping ||
        jsonb_build_object(v_package.id::TEXT, v_new_package_id::TEXT);

      v_packages_created := v_packages_created + 1;

      -- =============================================
      -- CREATE TASKS FOR THIS PACKAGE
      -- =============================================
      FOR v_task IN
        SELECT * FROM template_tasks
        WHERE package_id = v_package.id
          AND id != ALL(p_excluded_tasks)  -- Skip excluded optional tasks
        ORDER BY sort_order
      LOOP
        v_new_task_id := gen_random_uuid();

        INSERT INTO tasks (
          id, renovation_project_id, title, description,
          estimated_hours, checklist_items, status, priority,
          package_id, wbs_code, is_from_template, source_template_task_id
        ) VALUES (
          v_new_task_id, p_project_id, v_task.name, v_task.description,
          v_task.estimated_duration_days * 8,  -- Convert days to hours
          v_task.checklist_template,
          'open', 'normal',
          v_new_package_id, v_task.wbs_code, true, v_task.id
        );

        -- Store mapping
        v_id_mapping := v_id_mapping ||
          jsonb_build_object(v_task.id::TEXT, v_new_task_id::TEXT);

        v_tasks_created := v_tasks_created + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  -- =============================================
  -- CREATE DEPENDENCIES WITH REMAPPED IDs
  -- =============================================
  FOR v_dep IN
    SELECT * FROM template_dependencies
    WHERE template_id = p_template_id
      AND predecessor_task_id != ALL(p_excluded_tasks)
      AND successor_task_id != ALL(p_excluded_tasks)
  LOOP
    -- Only create if both tasks were created (not excluded)
    IF v_id_mapping ? v_dep.predecessor_task_id::TEXT
       AND v_id_mapping ? v_dep.successor_task_id::TEXT
    THEN
      INSERT INTO task_dependencies (
        task_id,
        depends_on_task_id,
        dependency_type,
        lag_days
      ) VALUES (
        (v_id_mapping ->> v_dep.successor_task_id::TEXT)::UUID,
        (v_id_mapping ->> v_dep.predecessor_task_id::TEXT)::UUID,
        v_dep.dependency_type,
        v_dep.lag_days
      );

      v_deps_created := v_deps_created + 1;
    END IF;
  END LOOP;

  -- =============================================
  -- CREATE QUALITY GATES WITH REMAPPED IDs
  -- =============================================
  FOR v_gate IN
    SELECT * FROM template_quality_gates
    WHERE template_id = p_template_id
  LOOP
    INSERT INTO project_quality_gates (
      id, project_id, gate_level,
      phase_id, package_id,
      name, description, checklist_items,
      min_photos_required, photo_types,
      is_blocking, auto_approve_when_complete,
      source_template_gate_id
    ) VALUES (
      gen_random_uuid(), p_project_id, v_gate.gate_level,
      CASE WHEN v_gate.phase_id IS NOT NULL
           THEN (v_id_mapping ->> v_gate.phase_id::TEXT)::UUID
           ELSE NULL END,
      CASE WHEN v_gate.package_id IS NOT NULL
           THEN (v_id_mapping ->> v_gate.package_id::TEXT)::UUID
           ELSE NULL END,
      v_gate.name, v_gate.description, v_gate.checklist_items,
      v_gate.min_photos_required, v_gate.photo_types,
      v_gate.is_blocking, v_gate.auto_approve_when_complete,
      v_gate.id
    );

    v_gates_created := v_gates_created + 1;
  END LOOP;

  -- =============================================
  -- UPDATE PROJECT METADATA
  -- =============================================
  UPDATE renovation_projects
  SET template_id = p_template_id,
      planned_start_date = COALESCE(planned_start_date, v_start)
  WHERE id = p_project_id;

  RETURN QUERY SELECT v_phases_created, v_packages_created, v_tasks_created, v_deps_created, v_gates_created;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_template_to_project IS 'Atomically applies a template to a project, creating phases, packages, tasks, dependencies, and quality gates with proper ID remapping';

-- =============================================
-- TMPL-06: CONDITION UPDATE ON PROJECT APPROVAL
-- =============================================

-- This function complements the existing on_project_approved trigger from 027_condition_tracking.sql
-- It provides a more comprehensive update that affects ALL rooms in the unit, not just
-- rooms that had tasks completed. This is appropriate when applying a template that
-- represents a complete renovation.

CREATE OR REPLACE FUNCTION update_condition_on_project_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    -- Get the unit for this project
    -- Update all rooms in the unit to 'new' condition
    UPDATE rooms
    SET
      condition = 'new',
      condition_updated_at = NOW(),
      condition_source_project_id = NEW.id
    WHERE unit_id = NEW.unit_id;

    -- Log condition changes to history (if table exists from 027_condition_tracking.sql)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'condition_history') THEN
      INSERT INTO condition_history (entity_type, entity_id, old_condition, new_condition, source_project_id, notes, changed_by)
      SELECT
        'room',
        r.id,
        r.condition,
        'new',
        NEW.id,
        'Automatisch aktualisiert nach Projekt-Abnahme: ' || NEW.name,
        NEW.approved_by
      FROM rooms r
      WHERE r.unit_id = NEW.unit_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger itself is already created in 027_condition_tracking.sql as projects_on_approved
-- We only update the function here to include all rooms in the unit.
-- If you want to use this version instead, drop and recreate the trigger:
-- DROP TRIGGER IF EXISTS projects_on_approved ON renovation_projects;
-- CREATE TRIGGER projects_on_approved_v2
--   AFTER UPDATE ON renovation_projects
--   FOR EACH ROW
--   WHEN (NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved'))
--   EXECUTE FUNCTION update_condition_on_project_approval();

COMMENT ON FUNCTION update_condition_on_project_approval IS 'TMPL-06: Updates room conditions to new when project is approved';
