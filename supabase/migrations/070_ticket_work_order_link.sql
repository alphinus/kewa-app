-- KEWA Renovations Operations System
-- Migration: 070_ticket_work_order_link.sql
-- Purpose: Link table between tickets and work orders for conversion tracking
-- Phase: 29-tenant-extras-ux, Plan: 02

-- =============================================
-- TICKET-WORK ORDER LINK TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS ticket_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  work_order_id UUID NOT NULL REFERENCES work_orders(id),
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  converted_by UUID NOT NULL REFERENCES users(id),
  UNIQUE(ticket_id)
);

COMMENT ON TABLE ticket_work_orders IS 'Tracks which tickets have been converted to work orders';
COMMENT ON COLUMN ticket_work_orders.ticket_id IS 'Source ticket that was converted';
COMMENT ON COLUMN ticket_work_orders.work_order_id IS 'Resulting work order from conversion';
COMMENT ON COLUMN ticket_work_orders.converted_at IS 'When the conversion occurred';
COMMENT ON COLUMN ticket_work_orders.converted_by IS 'Operator who performed the conversion';

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_ticket_work_orders_ticket ON ticket_work_orders(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_work_orders_wo ON ticket_work_orders(work_order_id);

-- =============================================
-- EXTEND TICKETS TABLE WITH CONVERSION FIELDS
-- =============================================

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS converted_to_wo_id UUID REFERENCES work_orders(id),
  ADD COLUMN IF NOT EXISTS conversion_message TEXT;

COMMENT ON COLUMN tickets.converted_to_wo_id IS 'Work order ID if ticket was converted';
COMMENT ON COLUMN tickets.conversion_message IS 'Message shown to tenant after conversion';

-- =============================================
-- INDEX FOR CONVERTED TICKETS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_tickets_converted ON tickets(converted_to_wo_id)
  WHERE converted_to_wo_id IS NOT NULL;
