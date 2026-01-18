-- KEWA Renovations Operations System
-- Migration: 036_task_dependencies_extended.sql
-- TMPL-04: Task dependencies with types and lag time

-- =============================================
-- EXTEND TASK DEPENDENCIES
-- =============================================

-- Add dependency_type column (uses enum from 032_templates.sql)
ALTER TABLE task_dependencies
ADD COLUMN IF NOT EXISTS dependency_type dependency_type NOT NULL DEFAULT 'FS';

-- Add lag_days column
ALTER TABLE task_dependencies
ADD COLUMN IF NOT EXISTS lag_days INTEGER DEFAULT 0;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN task_dependencies.dependency_type IS 'FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish';
COMMENT ON COLUMN task_dependencies.lag_days IS 'Delay in days after dependency condition met (can be negative for lead time)';
