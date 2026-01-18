-- KEWA Renovations Operations System
-- Migration: 012_task_enhancements.sql
-- DATA-07: Task dependencies and checklist functionality

-- =============================================
-- TASK ENHANCEMENTS
-- =============================================

-- Add new columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id),
ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(6,2),
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id),
ADD COLUMN IF NOT EXISTS renovation_project_id UUID REFERENCES renovation_projects(id);

-- =============================================
-- TASK DEPENDENCIES (Many-to-Many)
-- =============================================

-- Junction table for task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate dependencies
  CONSTRAINT unique_task_dependency UNIQUE(task_id, depends_on_task_id),

  -- Prevent self-reference
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_room_id ON tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_renovation_project_id ON tasks(renovation_project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE task_dependencies IS 'Many-to-many relationship for task dependencies';
COMMENT ON COLUMN task_dependencies.task_id IS 'The task that has a dependency';
COMMENT ON COLUMN task_dependencies.depends_on_task_id IS 'The task that must be completed first';
COMMENT ON COLUMN tasks.parent_task_id IS 'Parent task for subtask hierarchy';
COMMENT ON COLUMN tasks.checklist_items IS 'JSONB array: [{"id": "uuid", "text": "string", "completed": bool, "completed_at": "timestamp"}]';
COMMENT ON COLUMN tasks.estimated_hours IS 'Estimated hours to complete task';
COMMENT ON COLUMN tasks.actual_hours IS 'Actual hours spent on task';
COMMENT ON COLUMN tasks.room_id IS 'Optional link to specific room';
COMMENT ON COLUMN tasks.renovation_project_id IS 'Optional link to renovation project';
