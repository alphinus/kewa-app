-- Add RLS policies for buildings table
-- This table needs policies to be accessible via ANON_KEY

-- Enable RLS if not already enabled
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "buildings_select_all" ON buildings;
DROP POLICY IF EXISTS "buildings_insert_all" ON buildings;
DROP POLICY IF EXISTS "buildings_update_all" ON buildings;
DROP POLICY IF EXISTS "buildings_delete_all" ON buildings;

-- Create permissive policies (MVP - restrict later for production)
CREATE POLICY "buildings_select_all" ON buildings FOR SELECT USING (true);
CREATE POLICY "buildings_insert_all" ON buildings FOR INSERT WITH CHECK (true);
CREATE POLICY "buildings_update_all" ON buildings FOR UPDATE USING (true);
CREATE POLICY "buildings_delete_all" ON buildings FOR DELETE USING (true);

COMMENT ON POLICY "buildings_select_all" ON buildings IS 'Allow all users to read buildings';
