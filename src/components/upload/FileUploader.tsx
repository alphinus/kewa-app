'use client'

/**
 * FileUploader Component
 *
 * Mobile-optimized file upload UI with:
 * - Drag-and-drop (desktop) or tap to select (mobile)
 * - Camera capture option for photos
 * - Progress indicator during upload
 * - Preview after upload
 * - Delete button on uploaded items
 *
 * Used in contractor portal for document and photo uploads.
 */

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  validateContractorUpload,
  formatFileSize,
  type UploadMediaType,
} from '@/lib/storage/contractor-upload'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploading?: boolean
  progress?: number
  error?: string
}

interface FileUploaderProps {
  /** Media type for validation */
  mediaType: UploadMediaType
  /** Callback when file is uploaded successfully */
  onUpload: (file: File) => Promise<{ id: string; url: string } | null>
  /** Callback when file is deleted */
  onDelete?: (fileId: string) => Promise<boolean>
  /** Initially uploaded files */
  initialFiles?: UploadedFile[]
  /** Whether to show camera capture button (photos only) */
  showCamera?: boolean
  /** Maximum number of files */
  maxFiles?: number
  /** Disabled state */
  disabled?: boolean
  /** Custom label */
  label?: string
}

export default function FileUploader({
  mediaType,
  onUpload,
  onDelete,
  initialFiles = [],
  showCamera = false,
  maxFiles = 10,
  disabled = false,
  label,
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Get accept attribute for input
  const acceptTypes = mediaType === 'photo'
    ? 'image/*'
    : 'application/pdf'

  // Handle file selection
  const handleFiles = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0 || disabled) return

    // Check max files limit
    const remainingSlots = maxFiles - files.length
    if (remainingSlots <= 0) {
      toast.warning(`Maximal ${maxFiles} Dateien erlaubt`)
      return
    }

    // Process files (up to remaining slots)
    const filesToProcess = Array.from(selectedFiles).slice(0, remainingSlots)

    for (const file of filesToProcess) {
      // Validate
      const validation = validateContractorUpload(file, mediaType)
      if (!validation.valid) {
        toast.warning(validation.error)
        continue
      }

      // Add to list with uploading state
      const tempId = `temp-${Date.now()}-${Math.random()}`
      const tempFile: UploadedFile = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: '',
        uploading: true,
        progress: 0,
      }

      setFiles(prev => [...prev, tempFile])

      try {
        // Upload
        const result = await onUpload(file)

        if (result) {
          // Update with real data
          setFiles(prev =>
            prev.map(f =>
              f.id === tempId
                ? { ...f, id: result.id, url: result.url, uploading: false }
                : f
            )
          )
        } else {
          // Remove failed upload
          setFiles(prev => prev.filter(f => f.id !== tempId))
        }
      } catch (error) {
        console.error('Upload failed:', error)
        // Mark as error
        setFiles(prev =>
          prev.map(f =>
            f.id === tempId
              ? { ...f, uploading: false, error: 'Upload fehlgeschlagen' }
              : f
          )
        )
      }
    }
  }, [files.length, maxFiles, mediaType, disabled, onUpload])

  // Handle delete
  const handleDelete = useCallback(async (fileId: string) => {
    if (!onDelete || disabled) return

    const success = await onDelete(fileId)
    if (success) {
      setFiles(prev => prev.filter(f => f.id !== fileId))
    }
  }, [onDelete, disabled])

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (!disabled) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // Get label text
  const labelText = label || (mediaType === 'photo' ? 'Fotos hochladen' : 'Dokumente hochladen')

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-gray-400 cursor-pointer'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            fileInputRef.current?.click()
          }
        }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-3">
          {mediaType === 'photo' ? (
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </div>

        {/* Text */}
        <p className="text-gray-600 font-medium">{labelText}</p>
        <p className="text-gray-400 text-sm mt-1">
          {isDragging
            ? 'Datei hier ablegen'
            : 'Tippen oder Datei hierher ziehen'
          }
        </p>
        <p className="text-gray-400 text-xs mt-2">
          {mediaType === 'photo'
            ? 'JPEG, PNG, WebP - max. 10MB'
            : 'PDF - max. 20MB'
          }
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          multiple={maxFiles > 1}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Camera button (for photos on mobile) */}
      {showCamera && mediaType === 'photo' && (
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || files.length >= maxFiles}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Foto aufnehmen
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            disabled={disabled}
          />
        </button>
      )}

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Hochgeladene Dateien ({files.length}/{maxFiles})
          </p>
          <div className="space-y-2">
            {files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                isPhoto={mediaType === 'photo'}
                onDelete={onDelete ? () => handleDelete(file.id) : undefined}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// File item component
function FileItem({
  file,
  isPhoto,
  onDelete,
  disabled,
}: {
  file: UploadedFile
  isPhoto: boolean
  onDelete?: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg border
        ${file.error ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}
      `}
    >
      {/* Thumbnail or icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-200">
        {isPhoto && file.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : isPhoto ? (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-red-100">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate text-sm">
          {file.name}
        </p>
        <p className="text-gray-500 text-xs">
          {file.uploading ? (
            <span className="text-blue-600">Wird hochgeladen...</span>
          ) : file.error ? (
            <span className="text-red-600">{file.error}</span>
          ) : (
            formatFileSize(file.size)
          )}
        </p>
      </div>

      {/* Progress or actions */}
      {file.uploading ? (
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : file.error ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="flex-shrink-0 p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50"
          title="Entfernen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-red-600 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
          title="Löschen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
