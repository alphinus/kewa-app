-- Migration: 021_cost_views.sql
-- Purpose: Create cost aggregation views for reporting
-- Part of: Phase 07, Plan 03 (Cost & Finance Model)
-- Requirement: DATA-10 to DATA-13 (aggregation support)

-- Cost summary by project
CREATE OR REPLACE VIEW project_costs AS
SELECT
  rp.id as project_id,
  rp.name as project_name,
  rp.unit_id,
  rp.estimated_cost,

  -- Offers
  COALESCE(SUM(CASE WHEN o.status = 'accepted' THEN o.total_amount END), 0) as total_accepted_offers,

  -- Invoices
  COALESCE(SUM(i.total_amount), 0) as total_invoiced,
  COALESCE(SUM(i.amount_paid), 0) as total_paid,
  COALESCE(SUM(i.amount_outstanding), 0) as total_outstanding,

  -- Expenses
  COALESCE(SUM(e.amount), 0) as total_expenses,

  -- Totals
  COALESCE(SUM(i.total_amount), 0) + COALESCE(SUM(e.amount), 0) as total_cost,

  -- Variance
  COALESCE(SUM(i.total_amount), 0) + COALESCE(SUM(e.amount), 0) - COALESCE(rp.estimated_cost, 0) as variance_from_budget

FROM renovation_projects rp
LEFT JOIN offers o ON o.renovation_project_id = rp.id
LEFT JOIN invoices i ON i.renovation_project_id = rp.id
LEFT JOIN expenses e ON e.renovation_project_id = rp.id
GROUP BY rp.id, rp.name, rp.unit_id, rp.estimated_cost;

COMMENT ON VIEW project_costs IS 'Aggregated cost summary per renovation project';

-- Cost summary by unit
CREATE OR REPLACE VIEW unit_costs AS
SELECT
  u.id as unit_id,
  u.name as unit_name,
  u.rent_amount,

  -- From projects
  COALESCE(SUM(pc.total_cost), 0) as total_project_costs,

  -- Direct expenses (not linked to a project)
  COALESCE((
    SELECT SUM(e.amount)
    FROM expenses e
    WHERE e.unit_id = u.id AND e.renovation_project_id IS NULL
  ), 0) as direct_expenses,

  -- Total investment
  COALESCE(SUM(pc.total_cost), 0) + COALESCE((
    SELECT SUM(e.amount)
    FROM expenses e
    WHERE e.unit_id = u.id AND e.renovation_project_id IS NULL
  ), 0) as total_investment,

  -- ROI indicator (years to recover via rent)
  CASE
    WHEN u.rent_amount > 0 THEN
      (COALESCE(SUM(pc.total_cost), 0) + COALESCE((
        SELECT SUM(e.amount)
        FROM expenses e
        WHERE e.unit_id = u.id AND e.renovation_project_id IS NULL
      ), 0)) / (u.rent_amount * 12)
    ELSE NULL
  END as years_to_recover

FROM units u
LEFT JOIN project_costs pc ON pc.unit_id = u.id
GROUP BY u.id, u.name, u.rent_amount;

COMMENT ON VIEW unit_costs IS 'Aggregated cost and ROI summary per unit';

-- Cost summary by partner
CREATE OR REPLACE VIEW partner_costs AS
SELECT
  p.id as partner_id,
  p.company_name,
  p.partner_type,

  COUNT(DISTINCT o.id) as total_offers,
  COUNT(DISTINCT CASE WHEN o.status = 'accepted' THEN o.id END) as accepted_offers,
  COALESCE(SUM(CASE WHEN o.status = 'accepted' THEN o.total_amount END), 0) as total_offer_value,

  COUNT(DISTINCT i.id) as total_invoices,
  COALESCE(SUM(i.total_amount), 0) as total_invoiced,
  COALESCE(SUM(i.amount_paid), 0) as total_paid,
  COALESCE(SUM(i.amount_outstanding), 0) as outstanding,

  -- Average variance (invoice vs offer)
  AVG(i.variance_amount) as avg_variance

FROM partners p
LEFT JOIN offers o ON o.partner_id = p.id
LEFT JOIN invoices i ON i.partner_id = p.id
GROUP BY p.id, p.company_name, p.partner_type;

COMMENT ON VIEW partner_costs IS 'Aggregated cost and payment history per partner';

-- Cost by trade category (from expenses)
CREATE OR REPLACE VIEW expense_by_trade AS
SELECT
  e.trade_category,
  COUNT(*) as expense_count,
  SUM(e.amount) as total_amount
FROM expenses e
WHERE e.trade_category IS NOT NULL
GROUP BY e.trade_category;

COMMENT ON VIEW expense_by_trade IS 'Expense totals grouped by trade category';

-- Cost by trade category (from partner invoices)
CREATE OR REPLACE VIEW invoice_by_trade AS
SELECT
  tc as trade_category,
  COUNT(DISTINCT i.id) as invoice_count,
  SUM(i.total_amount) as total_invoiced
FROM partners p
CROSS JOIN LATERAL unnest(p.trade_categories) AS tc
JOIN invoices i ON i.partner_id = p.id
GROUP BY tc;

COMMENT ON VIEW invoice_by_trade IS 'Invoice totals grouped by partner trade category';

-- Combined trade costs view
CREATE OR REPLACE VIEW trade_costs AS
SELECT
  COALESCE(e.trade_category::TEXT, it.trade_category::TEXT) as trade_category,
  COALESCE(e.expense_count, 0) as expense_count,
  COALESCE(e.total_amount, 0) as expense_total,
  COALESCE(it.invoice_count, 0) as invoice_count,
  COALESCE(it.total_invoiced, 0) as invoice_total,
  COALESCE(e.total_amount, 0) + COALESCE(it.total_invoiced, 0) as combined_total
FROM expense_by_trade e
FULL OUTER JOIN invoice_by_trade it ON e.trade_category::TEXT = it.trade_category::TEXT;

COMMENT ON VIEW trade_costs IS 'Combined expense and invoice costs by trade category';

-- Monthly cost trend
CREATE OR REPLACE VIEW monthly_costs AS
SELECT
  date_trunc('month', COALESCE(e.paid_at, i.invoice_date::TIMESTAMPTZ)) as month,
  'expense' as cost_type,
  e.category::TEXT as category,
  SUM(e.amount) as amount
FROM expenses e
WHERE e.paid_at IS NOT NULL
GROUP BY 1, 2, 3

UNION ALL

SELECT
  date_trunc('month', i.invoice_date::TIMESTAMPTZ) as month,
  'invoice' as cost_type,
  'invoice' as category,
  SUM(i.total_amount) as amount
FROM invoices i
WHERE i.invoice_date IS NOT NULL
GROUP BY 1, 2, 3

ORDER BY month DESC;

COMMENT ON VIEW monthly_costs IS 'Monthly cost breakdown by type and category';
