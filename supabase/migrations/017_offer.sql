-- Migration: 017_offer.sql
-- Purpose: Create Offer entity for contractor/supplier offers (Offerten)
-- Part of: Phase 07, Plan 03 (Cost & Finance Model)
-- Requirement: DATA-10

-- Offer status enum
DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM (
    'draft',
    'sent',
    'received',
    'under_review',
    'accepted',
    'rejected',
    'expired',
    'superseded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  partner_id UUID NOT NULL REFERENCES partners(id),
  work_order_id UUID REFERENCES work_orders(id),
  renovation_project_id UUID REFERENCES renovation_projects(id),

  -- Offer details
  offer_number TEXT, -- External reference number
  title TEXT NOT NULL,
  description TEXT,

  -- Amounts
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  tax_rate DECIMAL(5,2) DEFAULT 7.7, -- Swiss VAT
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),

  -- Line items (optional detailed breakdown)
  line_items JSONB DEFAULT '[]',

  -- Status workflow
  status offer_status DEFAULT 'received',

  -- Dates
  offer_date DATE,
  valid_until DATE,
  received_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Decision
  accepted_by UUID REFERENCES users(id),
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT,

  -- Documents
  document_storage_path TEXT, -- PDF of offer

  -- Notes
  internal_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offers_partner ON offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_offers_work_order ON offers(work_order_id);
CREATE INDEX IF NOT EXISTS idx_offers_project ON offers(renovation_project_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- Updated at trigger
DROP TRIGGER IF EXISTS offers_updated_at ON offers;
CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate tax and total amounts
CREATE OR REPLACE FUNCTION calculate_offer_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tax_amount = NEW.amount * (NEW.tax_rate / 100);
  NEW.total_amount = NEW.amount + NEW.tax_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offers_calculate_totals ON offers;
CREATE TRIGGER offers_calculate_totals
  BEFORE INSERT OR UPDATE OF amount, tax_rate ON offers
  FOR EACH ROW EXECUTE FUNCTION calculate_offer_totals();

-- Comments for documentation
COMMENT ON TABLE offers IS 'Offers (Offerten) from contractors/suppliers for work orders';
COMMENT ON COLUMN offers.offer_number IS 'External reference number from the partner';
COMMENT ON COLUMN offers.amount IS 'Net amount before tax';
COMMENT ON COLUMN offers.tax_rate IS 'Tax rate in percent (default 7.7% Swiss VAT)';
COMMENT ON COLUMN offers.tax_amount IS 'Calculated tax amount (auto-computed)';
COMMENT ON COLUMN offers.total_amount IS 'Total amount including tax (auto-computed)';
COMMENT ON COLUMN offers.line_items IS 'JSONB array of line items: [{id, description, quantity, unit_price, total}]';
COMMENT ON COLUMN offers.document_storage_path IS 'Supabase storage path for offer PDF';
