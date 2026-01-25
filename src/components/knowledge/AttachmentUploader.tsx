'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface AttachmentUploaderProps {
  articleId: string
  onUploadComplete?: () => void
  maxSizeMB?: number
  disabled?: boolean
}

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp'

/**
 * File upload component for KB attachments
 * Supports drag-and-drop and file input with validation
 */
export function AttachmentUploader({
  articleId,
  onUploadComplete,
  maxSizeMB = 10,
  disabled = false,
}: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return

    setError(null)
    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        // Validate file size
        if (file.size > maxSizeMB * 1024 * 1024) {
          throw new Error(`Datei "${file.name}" zu gross (max ${maxSizeMB}MB)`)
        }

        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`/api/knowledge/${articleId}/attachments`, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Upload fehlgeschlagen')
        }
      }
      onUploadComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [articleId, disabled, maxSizeMB, onUploadComplete])

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (!disabled) {
      handleUpload(e.dataTransfer.files)
    }
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : disabled
              ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && !uploading && (e.key === 'Enter' || e.key === ' ')) {
            fileInputRef.current?.click()
          }
        }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-3">
          {uploading ? (
            <LoadingSpinner />
          ) : (
            <UploadIcon className="w-10 h-10 text-gray-400" />
          )}
        </div>

        {/* Text */}
        {uploading ? (
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Wird hochgeladen...
          </p>
        ) : (
          <>
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              {dragActive ? 'Datei hier ablegen' : 'Datei hochladen'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Klicken oder Datei hierher ziehen
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
              PDF, DOC, DOCX, PNG, JPEG, WebP - max. {maxSizeMB}MB
            </p>
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
          disabled={disabled || uploading}
        />
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <CloseIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// Icons
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="w-10 h-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
