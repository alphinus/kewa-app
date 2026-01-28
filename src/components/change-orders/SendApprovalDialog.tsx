'use client'

/**
 * SendApprovalDialog Component
 *
 * Dialog for sending approval magic link to client.
 * Captures client email, generates portal URL, displays link with copy button.
 *
 * Phase 21-04: Client Portal
 */

import { useState } from 'react'
import { Copy, Check, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SendApprovalDialogProps {
  changeOrderId: string
  coNumber: string
  isOpen: boolean
  onClose: () => void
  onSent?: () => void
}

interface ApprovalResponse {
  token: string
  portal_url: string
  expires_at: string
}

export function SendApprovalDialog({
  changeOrderId,
  coNumber,
  isOpen,
  onClose,
  onSent,
}: SendApprovalDialogProps) {
  const [clientEmail, setClientEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApprovalResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/change-orders/${changeOrderId}/send-approval`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_email: clientEmail,
            client_name: clientName || undefined,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send approval link')
      }

      setResult(data)
      onSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return

    try {
      await navigator.clipboard.writeText(result.portal_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleClose = () => {
    setClientEmail('')
    setClientName('')
    setError(null)
    setResult(null)
    setCopied(false)
    onClose()
  }

  const formatExpiryDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('de-CH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Genehmigungslink senden</DialogTitle>
          <DialogDescription>
            Senden Sie einen sicheren Genehmigungslink an den Kunden für{' '}
            {coNumber}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-email">
                  Kunden-E-Mail <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder="kunde@beispiel.ch"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-name">Kundenname (optional)</Label>
                <Input
                  id="client-name"
                  type="text"
                  placeholder="Max Mustermann"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/10 p-3 rounded-md">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  'Wird gesendet...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Genehmigungslink senden
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-md">
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                Genehmigungslink erfolgreich erstellt
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Gültig bis: {formatExpiryDate(result.expires_at)} (7 Tage)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Portal-URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={result.portal_url}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="In Zwischenablage kopieren"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md">
              <p className="font-medium mb-1">Nächste Schritte:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Link kopieren</li>
                <li>Per E-Mail an Kunden senden</li>
                <li>Kunde öffnet Link und genehmigt/lehnt ab</li>
              </ol>
            </div>

            <DialogFooter>
              <Button type="button" onClick={handleClose}>
                Schliessen
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
