-- Fix: Replace trigger function to remove Windows \r characters from JSON string
-- that caused "Character with value 0x0d must be escaped" errors
CREATE OR REPLACE FUNCTION validate_purchase_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB;
  allowed_next TEXT[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  valid_transitions := '{"draft":["ordered","cancelled"],"ordered":["confirmed","cancelled"],"confirmed":["delivered","cancelled"],"delivered":["invoiced"],"invoiced":[],"cancelled":[]}'::JSONB;

  allowed_next := ARRAY(SELECT jsonb_array_elements_text(valid_transitions->OLD.status::TEXT));

  IF NOT (NEW.status::TEXT = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status;
  END IF;

  CASE NEW.status
    WHEN 'ordered' THEN NEW.ordered_at = NOW();
    WHEN 'confirmed' THEN NEW.confirmed_at = NOW();
    WHEN 'delivered' THEN NEW.delivered_at = NOW();
    WHEN 'invoiced' THEN NEW.invoiced_at = NOW();
    WHEN 'cancelled' THEN NEW.cancelled_at = NOW();
    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
