'use client'

import { type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Form field wrapper with label and inline validation error display.
 *
 * Usage:
 * ```tsx
 * <FormField label="Telefonnummer" name="phone" error={errors.phone} required>
 *   <Input value={phone} onChange={...} onBlur={...} />
 * </FormField>
 * ```
 */

interface FormFieldProps {
  /** Field label */
  label: string
  /** Field name for id/aria attributes */
  name: string
  /** Validation error message */
  error?: string
  /** Whether field is required */
  required?: boolean
  /** Input element */
  children: ReactNode
  /** Optional additional class name */
  className?: string
  /** Optional hint text below input */
  hint?: string
}

export function FormField({
  label,
  name,
  error,
  required,
  children,
  className,
  hint,
}: FormFieldProps) {
  const errorId = `${name}-error`
  const hintId = `${name}-hint`

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div
        className={cn(
          error && '[&>input]:border-red-500 [&>textarea]:border-red-500 [&>select]:border-red-500'
        )}
        aria-invalid={!!error}
        aria-describedby={
          [error ? errorId : null, hint ? hintId : null]
            .filter(Boolean)
            .join(' ') || undefined
        }
      >
        {children}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-sm text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
