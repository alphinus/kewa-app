-- KEWA Renovations Operations System
-- Migration: 038_work_order_events.sql
-- EXT-14: Timestamped event logging for work order activities

-- =============================================
-- EVENT TYPE ENUM
-- =============================================

-- All possible work order event types
CREATE TYPE work_order_event_type AS ENUM (
  'created',                 -- Work order created
  'sent',                    -- Magic link sent to contractor
  'viewed',                  -- Contractor first opened the work order
  'accepted',                -- Contractor accepted
  'rejected',                -- Contractor rejected
  'counter_offer_submitted', -- Contractor submitted counter-offer
  'counter_offer_approved',  -- KEWA approved counter-offer
  'counter_offer_rejected',  -- KEWA rejected counter-offer
  'started',                 -- Work started (in_progress)
  'completed',               -- Work marked done
  'upload_added',            -- File uploaded
  'upload_removed',          -- File removed
  'status_changed'           -- Any other status change
);

-- Actor type: who triggered the event
CREATE TYPE work_order_actor_type AS ENUM (
  'kewa',       -- KEWA staff
  'contractor', -- External contractor
  'system'      -- Automated system action
);

-- =============================================
-- WORK ORDER EVENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS work_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,

  -- Event details
  event_type work_order_event_type NOT NULL,
  event_data JSONB DEFAULT '{}',

  -- Actor information
  actor_type work_order_actor_type NOT NULL DEFAULT 'system',
  actor_id UUID REFERENCES users(id),  -- Null for contractors/system
  actor_email TEXT,                     -- For contractor actions

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- Primary query: get events for a work order
CREATE INDEX IF NOT EXISTS idx_work_order_events_work_order_id
  ON work_order_events(work_order_id);

-- Filter by event type
CREATE INDEX IF NOT EXISTS idx_work_order_events_type
  ON work_order_events(event_type);

-- Sort by time
CREATE INDEX IF NOT EXISTS idx_work_order_events_created_at
  ON work_order_events(created_at DESC);

-- Composite for efficient queries
CREATE INDEX IF NOT EXISTS idx_work_order_events_wo_created
  ON work_order_events(work_order_id, created_at DESC);

-- =============================================
-- TRIGGER: AUTO-LOG STATUS CHANGES
-- =============================================

-- Function to automatically log status changes
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
      'system'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS work_order_status_change_log ON work_orders;
CREATE TRIGGER work_order_status_change_log
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_work_order_status_change();

-- =============================================
-- TRIGGER: AUTO-LOG CREATION
-- =============================================

-- Function to automatically log work order creation
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
    CASE WHEN NEW.created_by IS NOT NULL THEN 'kewa' ELSE 'system' END,
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS work_order_created_log ON work_orders;
CREATE TRIGGER work_order_created_log
  AFTER INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_work_order_created();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE work_order_events IS 'Event log for work order activities (EXT-14)';
COMMENT ON COLUMN work_order_events.event_type IS 'Type of event that occurred';
COMMENT ON COLUMN work_order_events.event_data IS 'Additional event data (JSONB for flexibility)';
COMMENT ON COLUMN work_order_events.actor_type IS 'Who triggered: kewa, contractor, or system';
COMMENT ON COLUMN work_order_events.actor_id IS 'User ID if KEWA staff (null for contractors)';
COMMENT ON COLUMN work_order_events.actor_email IS 'Email for contractor actions';
