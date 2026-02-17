/**
 * Ticket to Work Order Conversion Service
 *
 * Handles the conversion of tenant tickets to internal work orders.
 * Includes photo copying and automatic ticket closure.
 *
 * Phase 29: Tenant Extras & UX Improvements
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// =============================================
// TYPES
// =============================================

interface ConvertTicketParams {
  ticketId: string
  operatorUserId: string
  workOrderType: string
  partnerId: string
  description?: string
}

interface ConvertTicketResult {
  workOrder: {
    id: string
    title: string
    description: string | null
    status: string
    partner_id: string
    room_id: string | null
    created_by: string
    created_at: string
  }
  ticket: {
    id: string
    ticket_number: string
    status: string
    closed_at: string | null
    converted_to_wo_id: string | null
    conversion_message: string | null
  }
}

// =============================================
// CONVERSION FUNCTION
// =============================================

/**
 * Convert a tenant ticket to a work order
 *
 * Steps:
 * 1. Fetch ticket with attachments and unit details
 * 2. Verify ticket is not already converted
 * 3. Verify ticket status allows conversion (offen or in_bearbeitung)
 * 4. Create work order with operator-selected type
 * 5. Copy ticket photos to work order media
 * 6. Create ticket_work_orders link record
 * 7. Update ticket with closure and conversion message
 */
export async function convertTicketToWorkOrder(
  params: ConvertTicketParams
): Promise<ConvertTicketResult> {
  const { ticketId, operatorUserId, workOrderType, partnerId, description } = params

  const supabase = await createServerClient()

  // Step 1: Fetch ticket with attachments and unit details
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      *,
      unit:units (
        id,
        name,
        building_id
      ),
      attachments:ticket_attachments (
        id,
        storage_path,
        file_name,
        file_size,
        mime_type
      )
    `)
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    throw new Error('Ticket nicht gefunden')
  }

  // Step 2: Verify ticket is not already converted
  if (ticket.converted_to_wo_id) {
    throw new Error('Ticket wurde bereits in einen Arbeitsauftrag umgewandelt')
  }

  // Step 3: Verify ticket status allows conversion
  if (!['offen', 'in_bearbeitung'].includes(ticket.status)) {
    throw new Error('Nur offene oder in Bearbeitung befindliche Tickets können umgewandelt werden')
  }

  // Get a room ID from the unit (first room or null)
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id')
    .eq('unit_id', ticket.unit_id)
    .limit(1)

  const roomId = rooms && rooms.length > 0 ? rooms[0].id : null

  // Step 4: Create work order
  const workOrderTitle = `Ticket ${ticket.ticket_number}: ${ticket.title.substring(0, 100)}`
  const workOrderDescription = description || ticket.description

  const { data: workOrder, error: woError } = await supabase
    .from('work_orders')
    .insert({
      title: workOrderTitle,
      description: workOrderDescription,
      room_id: roomId,
      partner_id: partnerId,
      status: 'draft',
      created_by: operatorUserId,
      internal_notes: `Umgewandelt aus Ticket ${ticket.ticket_number}`,
    })
    .select()
    .single()

  if (woError || !workOrder) {
    throw new Error(`Fehler beim Erstellen des Arbeitsauftrags: ${woError?.message}`)
  }

  // Step 5: Copy ticket photos to work order media
  const attachments = ticket.attachments || []
  if (attachments.length > 0) {
    // Create admin client with service role for storage operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    for (const attachment of attachments) {
      try {
        // Source path is the ticket attachment storage path
        const sourcePath = attachment.storage_path

        // Destination path in media bucket with work order prefix
        const destPath = `work_order/${workOrder.id}/${attachment.file_name}`

        // Copy file in storage
        const { error: copyError } = await supabaseAdmin.storage
          .from('media')
          .copy(sourcePath, destPath)

        if (copyError) {
          console.error(`Failed to copy attachment ${attachment.id}:`, copyError)
          continue
        }

        // Create media record for the copied file
        await supabase.from('media').insert({
          entity_type: 'work_order',
          entity_id: workOrder.id,
          media_type: 'photo',
          context: 'documentation',
          storage_path: destPath,
          file_name: attachment.file_name,
          file_size: attachment.file_size,
          mime_type: attachment.mime_type,
          uploaded_by: operatorUserId,
        })
      } catch (copyErr) {
        console.error(`Error copying attachment ${attachment.id}:`, copyErr)
        // Continue with remaining attachments
      }
    }
  }

  // Step 6: Create ticket_work_orders link record
  const { error: linkError } = await supabase.from('ticket_work_orders').insert({
    ticket_id: ticketId,
    work_order_id: workOrder.id,
    converted_by: operatorUserId,
  })

  if (linkError) {
    console.error('Failed to create ticket-work order link:', linkError)
    // Non-fatal - continue with ticket update
  }

  // Step 7: Update ticket with closure and conversion message
  const conversionMessage = 'Ihr Ticket wurde in einen Arbeitsauftrag umgewandelt'
  const now = new Date().toISOString()

  const { data: updatedTicket, error: updateError } = await supabase
    .from('tickets')
    .update({
      status: 'geschlossen',
      closed_at: now,
      closed_by: operatorUserId,
      converted_to_wo_id: workOrder.id,
      conversion_message: conversionMessage,
    })
    .eq('id', ticketId)
    .select()
    .single()

  if (updateError || !updatedTicket) {
    throw new Error(`Fehler beim Aktualisieren des Tickets: ${updateError?.message}`)
  }

  return {
    workOrder: {
      id: workOrder.id,
      title: workOrder.title,
      description: workOrder.description,
      status: workOrder.status,
      partner_id: workOrder.partner_id,
      room_id: workOrder.room_id,
      created_by: workOrder.created_by,
      created_at: workOrder.created_at,
    },
    ticket: {
      id: updatedTicket.id,
      ticket_number: updatedTicket.ticket_number,
      status: updatedTicket.status,
      closed_at: updatedTicket.closed_at,
      converted_to_wo_id: updatedTicket.converted_to_wo_id,
      conversion_message: updatedTicket.conversion_message,
    },
  }
}
