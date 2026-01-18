-- KEWA Renovations Operations System
-- Migration: 032_templates.sql
-- Template System Schema (Phase 08)
-- TMPL-01: Complete renovation templates
-- TMPL-02: Room-specific templates
-- TMPL-03: WBS hierarchy (Phase > Package > Task)

-- =============================================
-- ENUM TYPES
-- =============================================

-- Template categorization
CREATE TYPE template_category AS ENUM (
  'complete_renovation',    -- Komplett-Renovation
  'room_specific',          -- Raum-spezifisch (Bad, Kueche, etc.)
  'trade_specific'          -- Gewerk-spezifisch (Malerarbeiten, etc.)
);

-- Template scope (unit vs room level)
CREATE TYPE template_scope AS ENUM (
  'unit',      -- Applies to entire unit
  'room'       -- Applies to specific room type
);

-- Dependency types (standard project management)
CREATE TYPE dependency_type AS ENUM ('FS', 'SS', 'FF', 'SF');

-- Quality gate levels
CREATE TYPE gate_level AS ENUM ('package', 'phase');

-- =============================================
-- TEMPLATES TABLE (Root)
-- =============================================

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  category template_category NOT NULL,
  scope template_scope NOT NULL,

  -- For room-scoped templates
  target_room_type room_type,

  -- Calculated fields (updated by trigger)
  total_duration_days INTEGER,
  total_estimated_cost DECIMAL(12,2),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_scope ON templates(scope);
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_target_room ON templates(target_room_type) WHERE target_room_type IS NOT NULL;

-- Timestamp trigger
CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TEMPLATE PHASES TABLE (WBS Level 1)
-- =============================================

CREATE TABLE template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- WBS code (e.g., "1", "2", "3")
  wbs_code TEXT NOT NULL,

  -- Scheduling (calculated from packages/tasks)
  estimated_duration_days INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(template_id, wbs_code)
);

-- Indexes
CREATE INDEX idx_template_phases_template ON template_phases(template_id);
CREATE INDEX idx_template_phases_sort ON template_phases(template_id, sort_order);

-- Timestamp trigger
CREATE TRIGGER template_phases_updated_at
  BEFORE UPDATE ON template_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TEMPLATE PACKAGES TABLE (WBS Level 2)
-- =============================================

CREATE TABLE template_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES template_phases(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- WBS code (e.g., "1.1", "1.2", "2.1")
  wbs_code TEXT NOT NULL,

  -- Trade association (optional)
  trade_category trade_category,

  -- Scheduling (calculated from tasks)
  estimated_duration_days INTEGER,
  estimated_cost DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(phase_id, wbs_code)
);

-- Indexes
CREATE INDEX idx_template_packages_phase ON template_packages(phase_id);
CREATE INDEX idx_template_packages_sort ON template_packages(phase_id, sort_order);
CREATE INDEX idx_template_packages_trade ON template_packages(trade_category) WHERE trade_category IS NOT NULL;

-- Timestamp trigger
CREATE TRIGGER template_packages_updated_at
  BEFORE UPDATE ON template_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TEMPLATE TASKS TABLE (WBS Level 3)
-- =============================================

CREATE TABLE template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES template_packages(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- WBS code (e.g., "1.1.1", "1.1.2")
  wbs_code TEXT NOT NULL,

  -- Scheduling
  estimated_duration_days INTEGER NOT NULL DEFAULT 1,
  estimated_cost DECIMAL(10,2),

  -- Trade association
  trade_category trade_category,

  -- Task attributes
  is_optional BOOLEAN DEFAULT false,
  materials_list JSONB DEFAULT '[]'::JSONB,
  notes TEXT,

  -- Checklist template (copied to task on application)
  checklist_template JSONB DEFAULT '[]'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(package_id, wbs_code)
);

-- Indexes
CREATE INDEX idx_template_tasks_package ON template_tasks(package_id);
CREATE INDEX idx_template_tasks_sort ON template_tasks(package_id, sort_order);
CREATE INDEX idx_template_tasks_optional ON template_tasks(is_optional) WHERE is_optional = true;

-- Timestamp trigger
CREATE TRIGGER template_tasks_updated_at
  BEFORE UPDATE ON template_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TEMPLATE DEPENDENCIES TABLE
-- =============================================

CREATE TABLE template_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

  -- Dependencies link tasks (across any package/phase)
  predecessor_task_id UUID NOT NULL REFERENCES template_tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES template_tasks(id) ON DELETE CASCADE,

  -- Dependency type
  dependency_type dependency_type NOT NULL DEFAULT 'FS',

  -- Lag time (days)
  lag_days INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate dependencies
  UNIQUE(predecessor_task_id, successor_task_id),

  -- Prevent self-reference
  CHECK(predecessor_task_id != successor_task_id)
);

-- Indexes
CREATE INDEX idx_template_dependencies_template ON template_dependencies(template_id);
CREATE INDEX idx_template_dependencies_predecessor ON template_dependencies(predecessor_task_id);
CREATE INDEX idx_template_dependencies_successor ON template_dependencies(successor_task_id);

-- =============================================
-- TEMPLATE QUALITY GATES TABLE
-- =============================================

CREATE TABLE template_quality_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

  -- Gate location
  gate_level gate_level NOT NULL,
  phase_id UUID REFERENCES template_phases(id) ON DELETE CASCADE,
  package_id UUID REFERENCES template_packages(id) ON DELETE CASCADE,

  -- Gate definition
  name TEXT NOT NULL,
  description TEXT,

  -- Evidence requirements
  checklist_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  min_photos_required INTEGER DEFAULT 0,
  photo_types JSONB DEFAULT '["completion"]'::JSONB,

  -- Behavior
  is_blocking BOOLEAN DEFAULT false,  -- Soft blocking by default
  auto_approve_when_complete BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure gate is linked to exactly one entity
  CHECK(
    (gate_level = 'package' AND package_id IS NOT NULL AND phase_id IS NULL) OR
    (gate_level = 'phase' AND phase_id IS NOT NULL AND package_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_template_quality_gates_template ON template_quality_gates(template_id);
CREATE INDEX idx_template_quality_gates_phase ON template_quality_gates(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX idx_template_quality_gates_package ON template_quality_gates(package_id) WHERE package_id IS NOT NULL;

-- Timestamp trigger
CREATE TRIGGER template_quality_gates_updated_at
  BEFORE UPDATE ON template_quality_gates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TABLE COMMENTS
-- =============================================

COMMENT ON TABLE templates IS 'Renovation template library with WBS structure';
COMMENT ON COLUMN templates.category IS 'Template type: complete_renovation, room_specific, or trade_specific';
COMMENT ON COLUMN templates.scope IS 'Whether template applies to unit level or specific room type';
COMMENT ON COLUMN templates.target_room_type IS 'Required when scope = room';
COMMENT ON COLUMN templates.total_duration_days IS 'Calculated from task durations (trigger updated)';
COMMENT ON COLUMN templates.total_estimated_cost IS 'Sum of all task estimated costs (trigger updated)';

COMMENT ON TABLE template_phases IS 'WBS Level 1: Major renovation phases';
COMMENT ON COLUMN template_phases.wbs_code IS 'Hierarchical code (e.g., 1, 2, 3)';
COMMENT ON COLUMN template_phases.estimated_duration_days IS 'Calculated from packages (trigger updated)';

COMMENT ON TABLE template_packages IS 'WBS Level 2: Work packages within phases';
COMMENT ON COLUMN template_packages.wbs_code IS 'Hierarchical code (e.g., 1.1, 1.2)';
COMMENT ON COLUMN template_packages.trade_category IS 'Optional trade association for the package';

COMMENT ON TABLE template_tasks IS 'WBS Level 3: Individual tasks/work items';
COMMENT ON COLUMN template_tasks.wbs_code IS 'Hierarchical code (e.g., 1.1.1, 1.1.2)';
COMMENT ON COLUMN template_tasks.is_optional IS 'Can be toggled off during template application';
COMMENT ON COLUMN template_tasks.materials_list IS 'JSONB array: [{id, name, quantity, unit, estimated_cost}]';
COMMENT ON COLUMN template_tasks.checklist_template IS 'JSONB array: [{id, text, required}]';

COMMENT ON TABLE template_dependencies IS 'Task dependencies within template';
COMMENT ON COLUMN template_dependencies.dependency_type IS 'FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish';
COMMENT ON COLUMN template_dependencies.lag_days IS 'Delay in days after dependency condition met';

COMMENT ON TABLE template_quality_gates IS 'Checkpoints at package or phase boundaries';
COMMENT ON COLUMN template_quality_gates.checklist_items IS 'JSONB array: [{id, text, required}]';
COMMENT ON COLUMN template_quality_gates.photo_types IS 'JSONB array of required photo types';
COMMENT ON COLUMN template_quality_gates.is_blocking IS 'If true, blocks progression (soft blocking default)';
