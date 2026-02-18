-- KEWA v4.0: Multi-Tenant Schema Foundation
-- Migration: 076_rls_helpers.sql
-- Creates: current_organization_id(), set_org_context() RPC
-- Requirements: SCHEMA-05
-- Phase 35: Schema Foundation
--
-- CRITICAL: set_config uses is_local=true for transaction scope.
-- Using false would contaminate PgBouncer connection pool.

-- current_organization_id() — reads per-transaction context
-- Called from RLS policies: WHERE organization_id = current_organization_id()
-- Returns NULL (not error) if no context set — RLS query returns empty set, not error
CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION current_organization_id() IS
  'Returns the organization UUID set for the current transaction via set_org_context().
   Returns NULL if no context is set. Called by RLS policies for data isolation.
   SECURITY DEFINER: can be called safely from RLS without privilege escalation.';

-- set_org_context(org_id) — called via supabase.rpc() from API routes BEFORE any data query
-- true = LOCAL flag = transaction-scoped ONLY
-- This is safe with PgBouncer: the setting is cleared at transaction end
CREATE OR REPLACE FUNCTION set_org_context(org_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', org_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_org_context(UUID) IS
  'Sets the current organization context for the transaction.
   Use is_local=true (third parameter) to ensure transaction scope.
   Called via supabase.rpc("set_org_context", {org_id: "..."}) in API routes.
   PgBouncer-safe: setting is cleared at transaction end.';

-- Verification:
-- SELECT set_org_context('00000000-0000-0000-0000-000000000001');
-- SELECT current_organization_id();
-- Expected: returns '00000000-0000-0000-0000-000000000001'::UUID
--
-- Without context:
-- SELECT current_organization_id();
-- Expected: returns NULL (not error)
