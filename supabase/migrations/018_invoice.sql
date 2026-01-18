-- Migration: 018_invoice.sql
-- Purpose: Create Invoice entity for partner invoices (Rechnungen)
-- Part of: Phase 07, Plan 03 (Cost & Finance Model)
-- Requirement: DATA-11

-- Invoice status enum
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'received',
    'under_review',
    'approved',
    'disputed',
    'partially_paid',
    'paid',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  partner_id UUID NOT NULL REFERENCES partners(id),
  offer_id UUID REFERENCES offers(id), -- Links to accepted offer
  work_order_id UUID REFERENCES work_orders(id),
  renovation_project_id UUID REFERENCES renovation_projects(id),

  -- Invoice details
  invoice_number TEXT NOT NULL, -- External invoice number
  title TEXT,
  description TEXT,

  -- Amounts
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  tax_rate DECIMAL(5,2) DEFAULT 7.7,
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),

  -- Payment tracking
  amount_paid DECIMAL(12,2) DEFAULT 0,
  amount_outstanding DECIMAL(12,2),

  -- Line items
  line_items JSONB DEFAULT '[]',

  -- Status
  status invoice_status DEFAULT 'received',

  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Approval
  approved_by UUID REFERENCES users(id),

  -- Variance tracking (vs offer)
  offer_amount DECIMAL(12,2), -- Copied from linked offer
  variance_amount DECIMAL(12,2), -- invoice - offer
  variance_reason TEXT,

  -- Documents
  document_storage_path TEXT NOT NULL, -- PDF of invoice (required)

  -- Notes
  internal_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_partner ON invoices(partner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_offer ON invoices(offer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_work_order ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(renovation_project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Updated at trigger
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-calculate totals, outstanding, and variance
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate tax and total
  NEW.tax_amount = NEW.amount * (NEW.tax_rate / 100);
  NEW.total_amount = NEW.amount + NEW.tax_amount;
  NEW.amount_outstanding = NEW.total_amount - COALESCE(NEW.amount_paid, 0);

  -- Get offer amount if linked to offer and not already set
  IF NEW.offer_id IS NOT NULL AND NEW.offer_amount IS NULL THEN
    SELECT total_amount INTO NEW.offer_amount FROM offers WHERE id = NEW.offer_id;
  END IF;

  -- Calculate variance if offer amount is known
  IF NEW.offer_amount IS NOT NULL THEN
    NEW.variance_amount = NEW.total_amount - NEW.offer_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_calculate_totals ON invoices;
CREATE TRIGGER invoices_calculate_totals
  BEFORE INSERT OR UPDATE OF amount, tax_rate, amount_paid, offer_id ON invoices
  FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

-- Comments for documentation
COMMENT ON TABLE invoices IS 'Invoices (Rechnungen) from partners for completed work';
COMMENT ON COLUMN invoices.invoice_number IS 'External invoice number from the partner';
COMMENT ON COLUMN invoices.amount IS 'Net amount before tax';
COMMENT ON COLUMN invoices.amount_paid IS 'Sum of all completed payments';
COMMENT ON COLUMN invoices.amount_outstanding IS 'Remaining balance (auto-computed)';
COMMENT ON COLUMN invoices.offer_amount IS 'Original offer amount for variance tracking';
COMMENT ON COLUMN invoices.variance_amount IS 'Difference between invoice and offer (auto-computed)';
COMMENT ON COLUMN invoices.document_storage_path IS 'Supabase storage path for invoice PDF (required)';
