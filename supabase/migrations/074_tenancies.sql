-- KEWA v4.0: Multi-Tenant Schema Foundation
-- Migration: 074_tenancies.sql
-- Creates: tenancies (replaces ad-hoc tenant_name on units)
-- Requirements: SCHEMA-03
-- Phase 35: Schema Foundation

-- =============================================
-- TENANCIES TABLE (SCHEMA-03 + D8 Swiss tenancy law)
-- All column names in English per D1 (no German names)
-- base_rent = Nettomiete, ancillary_costs = Nebenkosten-Akonto
-- deposit_amount = Mietkaution, notice_period_months = Kuendigungsfrist
-- =============================================

CREATE TABLE IF NOT EXISTS tenancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  -- Tenant contact info
  tenant_name TEXT NOT NULL,
  tenant_email TEXT,
  tenant_phone TEXT,
  -- Swiss rental law fields (D8, all nullable for flexibility)
  base_rent DECIMAL(10,2),              -- Nettomiete (OR 257a)
  ancillary_costs DECIMAL(10,2),        -- Nebenkosten-Akonto
  deposit_amount DECIMAL(10,2),         -- Mietkaution (max 3x Monatsmiete per OR 257e)
  notice_period_months INTEGER DEFAULT 3, -- Kuendigungsfrist
  reference_interest_rate DECIMAL(4,3), -- Referenzzinssatz (e.g. 1.750)
  contract_type TEXT DEFAULT 'residential'
    CHECK (contract_type IN ('residential', 'commercial', 'parking', 'storage')),
  -- Temporal fields
  start_date DATE NOT NULL,
  end_date DATE,                        -- NULL = ongoing
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenancies_org ON tenancies(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_unit ON tenancies(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_unit_active ON tenancies(unit_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tenancies_org_active ON tenancies(organization_id, is_active);
