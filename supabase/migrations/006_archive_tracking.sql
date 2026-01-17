-- Archive tracking for projects
-- Migration: 006_archive_tracking.sql

-- Add archived_at column to track when a project was archived
ALTER TABLE projects
ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient filtering of archived/non-archived projects
CREATE INDEX idx_projects_archived_at ON projects(archived_at);

-- Note: The check constraint for archived_at being set only when status='archived'
-- is enforced at the application level rather than database level to allow
-- atomic updates and better error handling.

-- Update existing archived projects (if any) to have archived_at timestamp
UPDATE projects
SET archived_at = created_at
WHERE status = 'archived' AND archived_at IS NULL;

-- Add comment
COMMENT ON COLUMN projects.archived_at IS 'Timestamp when project was archived. NULL for active projects.';
