'use client'

/**
 * InvoiceLinkModal Component
 *
 * Modal for searching and linking invoices to deliveries.
 * Filters invoices by supplier and provides client-side search.
 *
 * Phase 25-01: UX Polish (UXPL-01)
 */

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Delivery } from '@/types/suppliers'
import { formatSwissDate } from '@/lib/suppliers/purchase-order-queries'

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  amount: number
  status: string
  partner?: {
    company_name: string
  }
}

interface InvoiceLinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  delivery: Delivery
  supplierId: string
  onLinked: () => void
}

export function InvoiceLinkModal({
  open,
  onOpenChange,
  delivery,
  supplierId,
  onLinked,
}: InvoiceLinkModalProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [linkingId, setLinkingId] = useState<string | null>(null)

  // Fetch invoices when modal opens
  useEffect(() => {
    if (!open || !supplierId) return

    async function fetchInvoices() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/invoices?partner_id=${supplierId}&limit=50`)

        if (!response.ok) {
          throw new Error('Fehler beim Laden der Rechnungen')
        }

        const data = await response.json()
        setInvoices(data.invoices || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [open, supplierId])

  // Filter invoices by search query (client-side)
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices

    const query = searchQuery.toLowerCase()
    return invoices.filter((invoice) =>
      invoice.invoice_number.toLowerCase().includes(query)
    )
  }, [invoices, searchQuery])

  // Handle invoice link
  async function handleLinkInvoice(invoiceId: string) {
    try {
      setLinkingId(invoiceId)
      setError(null)

      const response = await fetch(`/api/deliveries/${delivery.id}/link-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Verknuepfung fehlgeschlagen')
      }

      // Success - notify parent and close modal
      onLinked()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechnung verknuepfen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search input */}
          <div>
            <label htmlFor="invoice-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rechnungsnummer suchen
            </label>
            <input
              id="invoice-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechnungsnummer eingeben..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredInvoices.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchQuery.trim() ? (
                <p>Keine Rechnungen gefunden mit "{searchQuery}"</p>
              ) : (
                <p>Keine Rechnungen für diesen Lieferanten</p>
              )}
            </div>
          )}

          {/* Invoice list */}
          {!loading && filteredInvoices.length > 0 && (
            <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {invoice.invoice_number}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatSwissDate(invoice.invoice_date)}</span>
                      <span>CHF {invoice.amount.toFixed(2)}</span>
                      <span className="capitalize">{invoice.status}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLinkInvoice(invoice.id)}
                    disabled={linkingId === invoice.id}
                  >
                    {linkingId === invoice.id ? 'Verknuepfen...' : 'Verknuepfen'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
