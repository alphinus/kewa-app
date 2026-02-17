'use client'

/**
 * Ticket Convert Dialog
 *
 * Dialog for converting a tenant ticket to a work order.
 * Operator must manually select work order type and partner.
 *
 * Phase 29: Tenant Extras & UX Improvements
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Ticket } from '@/types/portal'

// =============================================
// TYPES
// =============================================

interface Partner {
  id: string
  company_name: string
}

interface TicketConvertDialogProps {
  ticket: Ticket
  open: boolean
  onOpenChange: (open: boolean) => void
  onConvert: (data: {
    work_order_type: string
    partner_id: string
    description?: string
  }) => Promise<void>
}

// Work order types available for conversion
const WORK_ORDER_TYPES = [
  { value: 'wartung', label: 'Wartung' },
  { value: 'reparatur', label: 'Reparatur' },
  { value: 'inspektion', label: 'Inspektion' },
  { value: 'installation', label: 'Installation' },
  { value: 'reinigung', label: 'Reinigung' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

// =============================================
// COMPONENT
// =============================================

export function TicketConvertDialog({
  ticket,
  open,
  onOpenChange,
  onConvert,
}: TicketConvertDialogProps) {
  const [workOrderType, setWorkOrderType] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [description, setDescription] = useState(ticket.description || '')
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingPartners, setLoadingPartners] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch partners when dialog opens
  useEffect(() => {
    if (open && partners.length === 0) {
      fetchPartners()
    }
  }, [open, partners.length])

  // Reset form when ticket changes
  useEffect(() => {
    setDescription(ticket.description || '')
    setWorkOrderType('')
    setPartnerId('')
    setError(null)
  }, [ticket.id, ticket.description])

  async function fetchPartners() {
    setLoadingPartners(true)
    try {
      const res = await fetch('/api/partners?type=contractor&is_active=true')
      if (res.ok) {
        const data = await res.json()
        setPartners(data.partners || [])
      }
    } catch (err) {
      console.error('Failed to fetch partners:', err)
    } finally {
      setLoadingPartners(false)
    }
  }

  async function handleSubmit() {
    // Validate required fields
    if (!workOrderType) {
      setError('Bitte wählen Sie einen Arbeitsauftragstyp aus')
      return
    }
    if (!partnerId) {
      setError('Bitte wählen Sie einen Partner aus')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onConvert({
        work_order_type: workOrderType,
        partner_id: partnerId,
        description: description || undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Umwandlung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ticket in Arbeitsauftrag umwandeln</DialogTitle>
          <DialogDescription>
            Ticket {ticket.ticket_number} wird geschlossen und ein neuer
            Arbeitsauftrag erstellt.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-4">
          {/* Work Order Type Selector - REQUIRED */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arbeitsauftragstyp *
            </label>
            <Select value={workOrderType} onValueChange={setWorkOrderType}>
              <SelectTrigger>
                <SelectValue placeholder="Typ auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {WORK_ORDER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Partner Selector - REQUIRED */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Partner *
            </label>
            <Select
              value={partnerId}
              onValueChange={setPartnerId}
              disabled={loadingPartners}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingPartners ? 'Laden...' : 'Partner auswählen...'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.company_name}
                  </SelectItem>
                ))}
                {partners.length === 0 && !loadingPartners && (
                  <SelectItem value="" disabled>
                    Keine Partner verfügbar
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Description - Optional, pre-filled with ticket description */}
          <Textarea
            label="Beschreibung"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschreibung für den Arbeitsauftrag..."
            rows={4}
          />

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Umwandeln
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
