-- KEWA v4.0: Multi-Tenant Schema Foundation
-- Migration: 073_org_foundation.sql
-- Creates: organizations, organization_members, owners, mandates
-- Requirements: SCHEMA-01, SCHEMA-02
-- Phase 35: Schema Foundation

-- =============================================
-- ORGANIZATIONS TABLE (SCHEMA-01 + D5 Swiss legal fields)
-- =============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  uid TEXT,                      -- Unternehmens-Identifikationsnummer CHE-xxx
  vat_number TEXT,               -- MwSt-Nummer
  commercial_register TEXT,      -- Handelsregister-Eintrag
  bank_account TEXT,             -- IBAN
  country TEXT DEFAULT 'CH',     -- D11 international extensibility
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);

-- =============================================
-- ORGANIZATION_MEMBERS TABLE (SCHEMA-01)
-- =============================================

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
-- Partial index: efficiently find user's default org
CREATE INDEX IF NOT EXISTS idx_org_members_user_default
  ON organization_members(user_id, is_default)
  WHERE is_default = true;

-- =============================================
-- OWNERS TABLE (SCHEMA-02 + D4 owner model)
-- owner_type uses text + CHECK (consistent with existing schema style)
-- user_id FK nullable -- owner portal deferred per CONTEXT.md Deferred Ideas
-- =============================================

CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL DEFAULT 'person'
    CHECK (owner_type IN ('person', 'company', 'community', 'stwe_association')),
  name TEXT NOT NULL,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'CH',
  phone TEXT,
  email TEXT,
  language TEXT DEFAULT 'de',
  user_id UUID REFERENCES users(id),   -- nullable: owner portal login (future)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owners_org ON owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_owners_org_type ON owners(organization_id, owner_type);

-- =============================================
-- MANDATES TABLE (SCHEMA-02 + D3 temporal mandates)
-- mandate_type uses text + CHECK (consistent with schema style)
-- end_date NULL = ongoing contract
-- =============================================

CREATE TABLE IF NOT EXISTS mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES owners(id),
  name TEXT NOT NULL,
  mandate_type TEXT NOT NULL DEFAULT 'rental'
    CHECK (mandate_type IN ('rental', 'stwe', 'mixed')),
  start_date DATE NOT NULL,
  end_date DATE,          -- NULL = ongoing
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mandates_org ON mandates(organization_id);
CREATE INDEX IF NOT EXISTS idx_mandates_owner ON mandates(owner_id);
CREATE INDEX IF NOT EXISTS idx_mandates_org_active ON mandates(organization_id, is_active);
