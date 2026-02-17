'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/**
 * Confirmation dialog for destructive or important actions.
 *
 * Usage:
 * ```tsx
 * <ConfirmationDialog
 *   open={showDelete}
 *   onOpenChange={setShowDelete}
 *   title="Liegenschaft löschen?"
 *   description="Diese Aktion kann nicht rückgängig gemacht werden."
 *   confirmLabel="Löschen"
 *   variant="danger"
 *   onConfirm={handleDelete}
 * />
 * ```
 */

interface ConfirmationDialogProps {
  /** Dialog open state */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /** Dialog description/body text */
  description: string
  /** Confirm button label (default: "Bestaetigen") */
  confirmLabel?: string
  /** Cancel button label (default: "Abbrechen") */
  cancelLabel?: string
  /** Callback when user confirms */
  onConfirm: () => void
  /** Visual variant for confirm button */
  variant?: 'danger' | 'primary'
  /** Loading state for confirm button */
  loading?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Bestaetigen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  variant = 'primary',
  loading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    if (!loading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        role="alertdialog"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
      >
        <DialogHeader>
          <DialogTitle id="confirmation-title">{title}</DialogTitle>
          <DialogDescription id="confirmation-description">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
