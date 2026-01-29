'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TicketMessageWithAttachments } from '@/types/portal'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Custom hook for real-time ticket messages with Supabase Realtime
 * Fetches messages and subscribes to new message INSERTs
 */
export function useTicketMessages(ticketId: string) {
  const [messages, setMessages] = useState<TicketMessageWithAttachments[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/portal/tickets/${ticketId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchMessages()

    // Subscribe to new messages
    const channel: RealtimeChannel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          // Refetch all messages when new one arrives
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [ticketId])

  return { messages, loading, refetch: fetchMessages }
}
