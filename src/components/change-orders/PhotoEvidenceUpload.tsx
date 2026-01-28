/**
 * Photo Evidence Upload Component
 *
 * Drag-and-drop or click-to-upload interface for change order photos.
 * Phase 21-03: Photo Evidence and PDF Generation
 */

'use client'

import { useState, useCallback } from 'react'
import { Upload, X, AlertCircle } from 'lucide-react'

interface PhotoEvidenceUploadProps {
  changeOrderId: string
  onUploadSuccess?: (photo: any) => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function PhotoEvidenceUpload({ changeOrderId, onUploadSuccess }: PhotoEvidenceUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [caption, setCaption] = useState('')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Bitte wählen Sie eine Bilddatei aus'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Dateigrösse überschreitet 10MB Limit'
    }
    return null
  }

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (caption.trim()) {
        formData.append('caption', caption.trim())
      }

      const response = await fetch(`/api/change-orders/${changeOrderId}/photos`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload fehlgeschlagen')
      }

      const data = await response.json()
      setCaption('')
      onUploadSuccess?.(data.photo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        uploadFile(files[0])
      }
    },
    [changeOrderId, caption]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        uploadFile(files[0])
      }
    },
    [changeOrderId, caption]
  )

  return (
    <div className="space-y-4">
      {/* Caption input */}
      <div>
        <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-1">
          Bildunterschrift (optional)
        </label>
        <input
          type="text"
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Beschreibung des Fotos"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          disabled={uploading}
        />
      </div>

      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="flex flex-col items-center space-y-3">
          <Upload className={`w-12 h-12 ${uploading ? 'text-gray-400' : 'text-gray-400'}`} />
          {uploading ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Wird hochgeladen...</p>
              <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">
                Klicken zum Auswählen oder Datei hierher ziehen
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF bis 10MB</p>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
