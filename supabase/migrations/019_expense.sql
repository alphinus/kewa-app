-- Migration: 019_expense.sql
-- Purpose: Create Expense entity for manual cash/petty cash entries
-- Part of: Phase 07, Plan 03 (Cost & Finance Model)
-- Requirement: DATA-12

-- Expense category enum
DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM (
    'material',
    'labor',
    'equipment_rental',
    'travel',
    'permits',
    'disposal',
    'utilities',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Expense payment method enum
DO $$ BEGIN
  CREATE TYPE expense_payment_method AS ENUM (
    'cash',
    'petty_cash',
    'company_card',
    'personal_reimbursement'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships (at least one required)
  renovation_project_id UUID REFERENCES renovation_projects(id),
  work_order_id UUID REFERENCES work_orders(id),
  unit_id UUID REFERENCES units(id),
  room_id UUID REFERENCES rooms(id),

  -- Expense details
  title TEXT NOT NULL,
  description TEXT,
  category expense_category NOT NULL,

  -- Amounts
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  tax_included BOOLEAN DEFAULT true,

  -- Payment
  payment_method expense_payment_method NOT NULL,
  paid_by UUID REFERENCES users(id),
  paid_at TIMESTAMPTZ DEFAULT NOW(),

  -- Vendor (not necessarily a registered partner)
  vendor_name TEXT,
  partner_id UUID REFERENCES partners(id), -- Optional link to partner

  -- Receipt
  receipt_storage_path TEXT,
  receipt_number TEXT,

  -- Trade category (for reporting)
  trade_category trade_category,

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses(renovation_project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_work_order ON expenses(work_order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_unit ON expenses(unit_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_at ON expenses(paid_at);

-- Updated at trigger
DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Validation: at least one relationship required
CREATE OR REPLACE FUNCTION validate_expense_relationship()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.renovation_project_id IS NULL
     AND NEW.work_order_id IS NULL
     AND NEW.unit_id IS NULL
     AND NEW.room_id IS NULL THEN
    RAISE EXCEPTION 'Expense must be linked to at least one entity (project, work_order, unit, or room)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expenses_validate_relationship ON expenses;
CREATE TRIGGER expenses_validate_relationship
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION validate_expense_relationship();

-- Comments for documentation
COMMENT ON TABLE expenses IS 'Manual expense entries (cash, petty cash, travel, etc.)';
COMMENT ON COLUMN expenses.category IS 'Expense category for classification and reporting';
COMMENT ON COLUMN expenses.payment_method IS 'How the expense was paid';
COMMENT ON COLUMN expenses.vendor_name IS 'Vendor name if not a registered partner';
COMMENT ON COLUMN expenses.trade_category IS 'Trade category for trade-based cost reporting';
COMMENT ON COLUMN expenses.receipt_storage_path IS 'Supabase storage path for receipt image/PDF';
