-- KEWA Renovations Operations System
-- Migration: 014_partner.sql
-- DATA-09: Partner entity (Handwerker, Lieferanten)

-- =============================================
-- PARTNER TYPE ENUM
-- =============================================

CREATE TYPE partner_type AS ENUM ('contractor', 'supplier');

-- =============================================
-- TRADE CATEGORY ENUM
-- =============================================

CREATE TYPE trade_category AS ENUM (
  'general',
  'plumbing',
  'electrical',
  'hvac',
  'painting',
  'flooring',
  'carpentry',
  'roofing',
  'masonry',
  'glazing',
  'landscaping',
  'cleaning',
  'demolition',
  'other'
);

-- =============================================
-- PARTNERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type
  partner_type partner_type NOT NULL,

  -- Basic info
  company_name TEXT NOT NULL,
  contact_name TEXT,

  -- Contact details
  email TEXT,
  phone TEXT,
  address TEXT,

  -- Trade info (for contractors) - array for multi-trade
  trade_categories trade_category[] DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(partner_type);
CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_trade_categories ON partners USING GIN(trade_categories);

-- =============================================
-- LINK WORK ORDERS TO PARTNERS
-- =============================================

-- Add foreign key constraint to work_orders
ALTER TABLE work_orders
ADD CONSTRAINT fk_work_orders_partner
FOREIGN KEY (partner_id) REFERENCES partners(id);

-- =============================================
-- TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS partners_updated_at ON partners;
CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE partners IS 'External partners: contractors (Handwerker) and suppliers (Lieferanten)';
COMMENT ON COLUMN partners.partner_type IS 'Type of partner: contractor or supplier';
COMMENT ON COLUMN partners.trade_categories IS 'Array of trade categories for multi-trade contractors';
COMMENT ON COLUMN partners.is_active IS 'Whether partner is currently active/available';
