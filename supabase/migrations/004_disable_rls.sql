-- Disable RLS for all tables
-- Auth is handled at API level via middleware and session tokens
-- This simplifies database access for this internal business app

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated and anon roles
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON buildings TO anon, authenticated;
GRANT ALL ON units TO anon, authenticated;
GRANT ALL ON projects TO anon, authenticated;
GRANT ALL ON tasks TO anon, authenticated;
GRANT ALL ON task_photos TO anon, authenticated;
