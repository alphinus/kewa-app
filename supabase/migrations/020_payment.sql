-- Migration: 020_payment.sql
-- Purpose: Create Payment entity for invoice payments
-- Part of: Phase 07, Plan 03 (Cost & Finance Model)
-- Requirement: DATA-13

-- Payment method enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'bank_transfer',
    'cash',
    'check',
    'credit_card',
    'debit_card',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payment status enum
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  invoice_id UUID NOT NULL REFERENCES invoices(id),

  -- Payment details
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'completed',

  -- Bank details
  bank_reference TEXT, -- Transaction reference
  bank_account TEXT, -- Paid from account (partial, last 4 digits)

  -- Dates
  payment_date DATE NOT NULL,
  value_date DATE, -- When funds cleared

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Updated at trigger
DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update invoice amount_paid and status when payments change
CREATE OR REPLACE FUNCTION update_invoice_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_paid DECIMAL(12,2);
  v_total_amount DECIMAL(12,2);
BEGIN
  -- Get the invoice id (handle INSERT, UPDATE, DELETE)
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Calculate total completed payments for this invoice
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM payments
  WHERE invoice_id = v_invoice_id
    AND status = 'completed';

  -- Update the invoice amount_paid
  UPDATE invoices
  SET amount_paid = v_total_paid
  WHERE id = v_invoice_id;

  -- Get the updated invoice total and update status
  SELECT total_amount INTO v_total_amount
  FROM invoices WHERE id = v_invoice_id;

  -- Update invoice status based on payment
  UPDATE invoices
  SET
    status = CASE
      WHEN v_total_paid >= v_total_amount THEN 'paid'::invoice_status
      WHEN v_total_paid > 0 THEN 'partially_paid'::invoice_status
      ELSE status
    END,
    paid_at = CASE
      WHEN v_total_paid >= v_total_amount THEN NOW()
      ELSE paid_at
    END
  WHERE id = v_invoice_id
    AND status NOT IN ('cancelled', 'disputed');

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_update_invoice ON payments;
CREATE TRIGGER payments_update_invoice
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_paid_amount();

-- Comments for documentation
COMMENT ON TABLE payments IS 'Payments made against invoices';
COMMENT ON COLUMN payments.bank_reference IS 'Bank transaction reference number';
COMMENT ON COLUMN payments.bank_account IS 'Last 4 digits of account used for payment';
COMMENT ON COLUMN payments.payment_date IS 'Date payment was made';
COMMENT ON COLUMN payments.value_date IS 'Date funds were cleared/received';
