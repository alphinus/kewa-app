-- KEWA Renovations Operations System
-- Migration: 056_inventory_views_functions.sql
-- Purpose: Analytics views and reorder alert function for inventory tracking
-- Phase: 20-supplier-advanced, Plan: 01

-- =============================================
-- VIEW: CURRENT INVENTORY LEVELS
-- =============================================

CREATE OR REPLACE VIEW current_inventory_levels AS
SELECT DISTINCT ON (property_id)
  property_id,
  movement_date,
  tank_level,
  tank_capacity,
  level_percentage,
  daily_usage_rate,
  CASE WHEN daily_usage_rate > 0 THEN
    movement_date + (tank_level / daily_usage_rate)::INTEGER
  ELSE NULL END AS projected_empty_date
FROM inventory_movements
ORDER BY property_id, movement_date DESC, created_at DESC;

COMMENT ON VIEW current_inventory_levels IS 'Returns latest inventory level per property with projected stock-out date';

-- =============================================
-- VIEW: DELIVERY PRICE HISTORY
-- =============================================

CREATE OR REPLACE VIEW delivery_price_history AS
SELECT
  d.id AS delivery_id,
  d.delivery_date,
  d.property_id,
  po.supplier_id,
  d.quantity_received,
  d.quantity_unit,
  po.total_amount,
  CASE WHEN d.quantity_received > 0 THEN po.total_amount / d.quantity_received ELSE NULL END AS unit_price,
  to_char(d.delivery_date, 'YYYY-MM') AS year_month,
  EXTRACT(YEAR FROM d.delivery_date)::INTEGER AS year,
  EXTRACT(MONTH FROM d.delivery_date)::INTEGER AS month,
  EXTRACT(QUARTER FROM d.delivery_date)::INTEGER AS quarter
FROM deliveries d
JOIN purchase_orders po ON d.purchase_order_id = po.id
ORDER BY d.delivery_date DESC;

COMMENT ON VIEW delivery_price_history IS 'Delivery price history with unit_price (CHF/tonne) calculation';

-- =============================================
-- VIEW: SEASONAL CONSUMPTION
-- =============================================

CREATE OR REPLACE VIEW seasonal_consumption AS
SELECT
  property_id,
  year,
  month,
  quarter,
  COUNT(*) AS delivery_count,
  SUM(quantity_received) AS total_quantity,
  AVG(quantity_received) AS avg_quantity_per_delivery,
  AVG(unit_price) AS avg_unit_price
FROM delivery_price_history
GROUP BY property_id, year, month, quarter
ORDER BY property_id, year, month;

COMMENT ON VIEW seasonal_consumption IS 'Monthly aggregated consumption and pricing by property';

-- =============================================
-- FUNCTION: GET REORDER ALERTS
-- =============================================

CREATE OR REPLACE FUNCTION get_reorder_alerts(threshold_pct DECIMAL DEFAULT 25)
RETURNS TABLE (
  property_id UUID,
  current_level DECIMAL,
  tank_capacity DECIMAL,
  level_percentage DECIMAL,
  daily_usage_rate DECIMAL,
  days_until_empty INTEGER,
  projected_empty_date DATE,
  urgency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cil.property_id,
    cil.tank_level AS current_level,
    cil.tank_capacity,
    cil.level_percentage,
    cil.daily_usage_rate,
    CASE
      WHEN cil.daily_usage_rate > 0 THEN (cil.tank_level / cil.daily_usage_rate)::INTEGER
      ELSE NULL
    END AS days_until_empty,
    cil.projected_empty_date,
    CASE
      WHEN cil.daily_usage_rate > 0 AND (cil.tank_level / cil.daily_usage_rate) <= 7 THEN 'critical'::TEXT
      WHEN cil.daily_usage_rate > 0 AND (cil.tank_level / cil.daily_usage_rate) <= 14 THEN 'warning'::TEXT
      ELSE 'normal'::TEXT
    END AS urgency
  FROM current_inventory_levels cil
  WHERE cil.level_percentage <= threshold_pct
    AND cil.daily_usage_rate IS NOT NULL
  ORDER BY days_until_empty ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_reorder_alerts IS 'Returns properties below threshold_pct with urgency classification: critical (<= 7 days), warning (<= 14 days), normal (> 14 days)';
