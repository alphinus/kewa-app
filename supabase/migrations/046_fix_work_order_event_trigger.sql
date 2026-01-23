-- KEWA Renovations Operations System
-- Migration: 046_fix_work_order_event_trigger.sql
-- Fix: Cast actor_type to enum in trigger functions

-- =============================================
-- FIX: LOG CREATION TRIGGER
-- =============================================

-- Function to automatically log work order creation (fixed enum cast)
CREATE OR REPLACE FUNCTION log_work_order_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO work_order_events (
    work_order_id,
    event_type,
    event_data,
    actor_type,
    actor_id
  ) VALUES (
    NEW.id,
    'created',
    jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status::TEXT,
      'partner_id', NEW.partner_id
    ),
    CASE WHEN NEW.created_by IS NOT NULL THEN 'kewa'::work_order_actor_type ELSE 'system'::work_order_actor_type END,
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FIX: LOG STATUS CHANGE TRIGGER
-- =============================================

-- Function to automatically log status changes (fixed enum cast)
CREATE OR REPLACE FUNCTION log_work_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO work_order_events (
      work_order_id,
      event_type,
      event_data,
      actor_type
    ) VALUES (
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status::TEXT,
        'new_status', NEW.status::TEXT
      ),
      'system'::work_order_actor_type
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
