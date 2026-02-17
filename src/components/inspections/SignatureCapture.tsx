'use client'

/**
 * Signature Capture Component
 *
 * Canvas-based signature capture with typed name and refusal option.
 * Phase: 22-inspection-core Plan 03
 */

import { useState, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface SignatureCaptureProps {
  onSave: (imageDataUrl: string, signerName: string, signerRole: string) => Promise<void>
  onRefused: (reason: string) => Promise<void>
}

export function SignatureCapture({ onSave, onRefused }: SignatureCaptureProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [signerName, setSignerName] = useState('')
  const [signerRole, setSignerRole] = useState('Handwerker')
  const [isLoading, setIsLoading] = useState(false)
  const [showRefusal, setShowRefusal] = useState(false)
  const [refusalReason, setRefusalReason] = useState('')

  const handleClear = () => {
    sigCanvas.current?.clear()
  }

  const handleSave = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast.warning('Bitte zeichnen Sie eine Unterschrift')
      return
    }

    if (!signerName.trim()) {
      toast.warning('Bitte geben Sie Ihren Namen ein')
      return
    }

    setIsLoading(true)
    try {
      const dataUrl = sigCanvas.current.toDataURL('image/png')
      await onSave(dataUrl, signerName.trim(), signerRole.trim())
    } catch (error) {
      console.error('Error saving signature:', error)
      toast.error('Fehler beim Speichern der Unterschrift')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefuse = async () => {
    if (!refusalReason.trim()) {
      toast.warning('Bitte geben Sie einen Grund für die Verweigerung an')
      return
    }

    setIsLoading(true)
    try {
      await onRefused(refusalReason.trim())
    } catch (error) {
      console.error('Error refusing signature:', error)
      toast.error('Fehler beim Speichern der Verweigerung')
    } finally {
      setIsLoading(false)
    }
  }

  if (showRefusal) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">
            Unterschrift verweigert
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Bitte geben Sie einen Grund für die Verweigerung an.
          </p>
        </div>

        <div>
          <Label htmlFor="refusal-reason">Grund (erforderlich)</Label>
          <Textarea
            id="refusal-reason"
            value={refusalReason}
            onChange={(e) => setRefusalReason(e.target.value)}
            placeholder="Grund für die Verweigerung der Unterschrift..."
            rows={4}
            className="mt-1"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleRefuse}
            disabled={isLoading || !refusalReason.trim()}
            className="min-h-[48px]"
          >
            {isLoading ? 'Speichern...' : 'Ohne Unterschrift abschliessen'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowRefusal(false)}
            disabled={isLoading}
            className="min-h-[48px]"
          >
            Abbrechen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Canvas area */}
      <div>
        <Label>Unterschrift (bitte hier zeichnen)</Label>
        <div className="mt-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white overflow-hidden">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: 'w-full max-w-[500px] h-[200px]',
              style: { touchAction: 'none' },
            }}
            backgroundColor="white"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="mt-2"
        >
          Löschen
        </Button>
      </div>

      {/* Name input */}
      <div>
        <Label htmlFor="signer-name">Name (getippt zur Identifikation)</Label>
        <Input
          id="signer-name"
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Max Mustermann"
          className="mt-1 min-h-[48px]"
        />
      </div>

      {/* Role input */}
      <div>
        <Label htmlFor="signer-role">Rolle</Label>
        <Input
          id="signer-role"
          type="text"
          value={signerRole}
          onChange={(e) => setSignerRole(e.target.value)}
          placeholder="Handwerker"
          className="mt-1 min-h-[48px]"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="min-h-[48px]"
        >
          {isLoading ? 'Speichern...' : 'Unterschrift speichern'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowRefusal(true)}
          disabled={isLoading}
          className="min-h-[48px]"
        >
          Unterschrift verweigert
        </Button>
      </div>
    </div>
  )
}
