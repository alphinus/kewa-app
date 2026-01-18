-- KEWA Renovations Operations System
-- Migration: 033_template_triggers.sql
-- Template duration and cost calculation triggers

-- =============================================
-- PACKAGE DURATION/COST CALCULATION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_package_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_package_id UUID;
BEGIN
  -- Get affected package
  v_package_id := COALESCE(NEW.package_id, OLD.package_id);

  -- Update package estimated duration (max of tasks, not sum - tasks can overlap)
  -- and estimated cost (sum of tasks)
  UPDATE template_packages
  SET
    estimated_duration_days = (
      SELECT COALESCE(MAX(estimated_duration_days), 0)
      FROM template_tasks
      WHERE package_id = v_package_id
    ),
    estimated_cost = (
      SELECT COALESCE(SUM(estimated_cost), 0)
      FROM template_tasks
      WHERE package_id = v_package_id
    )
  WHERE id = v_package_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_package_totals
AFTER INSERT OR UPDATE OR DELETE ON template_tasks
FOR EACH ROW EXECUTE FUNCTION calculate_package_totals();

-- =============================================
-- PHASE DURATION CALCULATION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_phase_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_phase_id UUID;
BEGIN
  -- Get affected phase
  v_phase_id := COALESCE(NEW.phase_id, OLD.phase_id);

  -- Update phase estimated duration (sum of packages - sequential)
  UPDATE template_phases
  SET estimated_duration_days = (
    SELECT COALESCE(SUM(estimated_duration_days), 0)
    FROM template_packages
    WHERE phase_id = v_phase_id
  )
  WHERE id = v_phase_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_phase_totals
AFTER INSERT OR UPDATE OR DELETE ON template_packages
FOR EACH ROW EXECUTE FUNCTION calculate_phase_totals();

-- =============================================
-- TEMPLATE DURATION/COST CALCULATION
-- =============================================

CREATE OR REPLACE FUNCTION calculate_template_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_template_id UUID;
BEGIN
  -- Get affected template
  v_template_id := COALESCE(NEW.template_id, OLD.template_id);

  -- Update template totals
  UPDATE templates
  SET
    total_duration_days = (
      SELECT COALESCE(SUM(estimated_duration_days), 0)
      FROM template_phases
      WHERE template_id = v_template_id
    ),
    total_estimated_cost = (
      SELECT COALESCE(SUM(estimated_cost), 0)
      FROM template_packages tp
      JOIN template_phases tph ON tph.id = tp.phase_id
      WHERE tph.template_id = v_template_id
    )
  WHERE id = v_template_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_template_totals
AFTER INSERT OR UPDATE OR DELETE ON template_phases
FOR EACH ROW EXECUTE FUNCTION calculate_template_totals();

-- Also trigger on package changes for cost updates
CREATE TRIGGER trigger_calculate_template_totals_on_package
AFTER INSERT OR UPDATE OR DELETE ON template_packages
FOR EACH ROW
EXECUTE FUNCTION calculate_template_totals();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION calculate_package_totals() IS 'Updates package duration (max of tasks) and cost (sum of tasks)';
COMMENT ON FUNCTION calculate_phase_totals() IS 'Updates phase duration (sum of packages)';
COMMENT ON FUNCTION calculate_template_totals() IS 'Updates template totals from phases';
