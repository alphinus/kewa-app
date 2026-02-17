'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { compressImage, getCompressedMimeType } from '@/lib/imageCompression'
import { useOfflinePhoto } from '@/hooks/useOfflinePhoto'
import { toast } from 'sonner'
import type { TaskPhotoWithUrl, PhotoType } from '@/types/database'

interface PhotoUploadProps {
  taskId: string
  photoType: PhotoType
  maxPhotos?: number
  existingPhotos?: TaskPhotoWithUrl[]
  onUploadComplete?: (photo: TaskPhotoWithUrl) => void
  onDelete?: (photoId: string) => void
  disabled?: boolean
}

type UploadState = 'idle' | 'preview' | 'uploading' | 'success' | 'error'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

/**
 * Photo upload component with camera/gallery support
 * Features: preview, compression, upload with retry, existing photo display
 */
export function PhotoUpload({
  taskId,
  photoType,
  maxPhotos = 2,
  existingPhotos = [],
  onUploadComplete,
  onDelete,
  disabled = false,
}: PhotoUploadProps) {
  // Offline photo hook
  const { queuePhoto, pendingPhotoCount, isOnline } = useOfflinePhoto('task', taskId)

  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const photosCount = existingPhotos.length
  const canUpload = photosCount < maxPhotos && !disabled

  /**
   * Handle file selection from input
   */
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input for re-selection
    e.target.value = ''

    try {
      setUploadState('preview')
      setSelectedFile(file)
      setErrorMessage(null)

      // Compress image
      const compressed = await compressImage(file)
      setCompressedBlob(compressed)

      // Create preview URL
      const url = URL.createObjectURL(compressed)
      setPreviewUrl(url)
    } catch (err) {
      console.error('Error processing image:', err)
      setUploadState('error')
      setErrorMessage('Bild konnte nicht verarbeitet werden')
    }
  }, [])

  /**
   * Upload with exponential backoff retry
   */
  const uploadWithRetry = useCallback(async (blob: Blob, attempt = 1): Promise<TaskPhotoWithUrl> => {
    const formData = new FormData()
    formData.append('file', blob, `photo.${getCompressedMimeType().split('/')[1]}`)
    formData.append('task_id', taskId)
    formData.append('photo_type', photoType)

    const response = await fetch('/api/photos', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json()
      const error = new Error(data.error || 'Upload fehlgeschlagen')

      // Retry on server errors (5xx) or network issues
      if (attempt < MAX_RETRIES && (response.status >= 500 || response.status === 0)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)))
        return uploadWithRetry(blob, attempt + 1)
      }

      throw error
    }

    const data = await response.json()
    return data.photo
  }, [taskId, photoType])

  /**
   * Handle upload confirmation
   */
  const handleUpload = useCallback(async () => {
    if (!compressedBlob || !selectedFile) return

    try {
      setUploadState('uploading')
      setErrorMessage(null)

      if (isOnline) {
        // Online: use existing upload with retry
        const photo = await uploadWithRetry(compressedBlob)

        setUploadState('success')

        // Clean up preview
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }

        // Reset state after short delay to show success
        setTimeout(() => {
          setUploadState('idle')
          setPreviewUrl(null)
          setSelectedFile(null)
          setCompressedBlob(null)

          onUploadComplete?.(photo)
        }, 1000)
      } else {
        // Offline: queue for later upload
        await queuePhoto(selectedFile)
        toast.info('Foto wird hochgeladen, sobald die Verbindung wiederhergestellt ist', { duration: 4000 })

        // Clean up preview
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }

        // Reset state
        setUploadState('idle')
        setPreviewUrl(null)
        setSelectedFile(null)
        setCompressedBlob(null)
        // Don't call onUploadComplete since photo isn't on server yet
      }
    } catch (err) {
      console.error('Upload error:', err)

      // If online upload failed and we're offline now, queue it
      if (!isOnline && selectedFile) {
        try {
          await queuePhoto(selectedFile)
          toast.info('Foto wird hochgeladen, sobald die Verbindung wiederhergestellt ist', { duration: 4000 })

          // Clean up and reset
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl)
          }
          setUploadState('idle')
          setPreviewUrl(null)
          setSelectedFile(null)
          setCompressedBlob(null)
        } catch (queueErr) {
          setUploadState('error')
          setErrorMessage('Fehler beim Speichern des Fotos')
        }
      } else {
        setUploadState('error')
        setErrorMessage(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
      }
    }
  }, [compressedBlob, selectedFile, previewUrl, isOnline, queuePhoto, uploadWithRetry, onUploadComplete])

  /**
   * Cancel preview and reset
   */
  const handleCancel = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setUploadState('idle')
    setPreviewUrl(null)
    setSelectedFile(null)
    setCompressedBlob(null)
    setErrorMessage(null)
  }, [previewUrl])

  /**
   * Retry after error
   */
  const handleRetry = useCallback(() => {
    if (compressedBlob) {
      handleUpload()
    } else {
      handleCancel()
    }
  }, [compressedBlob, handleUpload, handleCancel])

  /**
   * Handle photo deletion
   */
  const handleDelete = useCallback(async (photoId: string) => {
    try {
      setDeleting(true)
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Löschen fehlgeschlagen')
      }

      setDeleteConfirmId(null)
      onDelete?.(photoId)
    } catch (err) {
      console.error('Delete error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
    } finally {
      setDeleting(false)
    }
  }, [onDelete])

  /**
   * Open camera input
   */
  const openCamera = useCallback(() => {
    cameraInputRef.current?.click()
  }, [])

  /**
   * Open file picker
   */
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={!canUpload}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={!canUpload}
      />

      {/* Existing photos grid */}
      {existingPhotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {existingPhotos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
              <img
                src={photo.url}
                alt={photo.file_name}
                className="w-full h-28 object-cover bg-gray-100 dark:bg-gray-800"
                loading="lazy"
              />
              {!disabled && (
                <>
                  {deleteConfirmId === photo.id ? (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-3">
                      <p className="text-white text-sm font-medium text-center">Foto löschen?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleDelete(photo.id)}
                          disabled={deleting}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 min-h-[40px] min-w-[60px]"
                        >
                          {deleting ? '...' : 'Ja'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={deleting}
                          className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 min-h-[40px] min-w-[60px]"
                        >
                          Nein
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(photo.id)}
                      className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                      aria-label="Foto löschen"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo count indicator */}
      {maxPhotos > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {photosCount} von {maxPhotos} Fotos
          </p>
          {photosCount < maxPhotos && (
            <span className="text-xs text-green-600 dark:text-green-400">
              + {maxPhotos - photosCount} möglich
            </span>
          )}
        </div>
      )}

      {/* Pending photo queue indicator */}
      {pendingPhotoCount > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {pendingPhotoCount} Foto(s) warten auf Upload
        </p>
      )}

      {/* Upload state: idle - show buttons */}
      {uploadState === 'idle' && canUpload && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={openCamera}
            className="sm:flex-1"
          >
            <CameraIcon className="w-5 h-5 mr-2" />
            Foto aufnehmen
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            onClick={openFilePicker}
            className="sm:flex-1"
          >
            <GalleryIcon className="w-5 h-5 mr-2" />
            Foto auswählen
          </Button>
        </div>
      )}

      {/* Upload state: preview - show image and confirm buttons */}
      {uploadState === 'preview' && previewUrl && (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={previewUrl}
              alt="Vorschau"
              className="w-full max-h-48 object-contain rounded-lg bg-gray-100 dark:bg-gray-800"
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleCancel}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              onClick={handleUpload}
            >
              Hochladen
            </Button>
          </div>
        </div>
      )}

      {/* Upload state: uploading - show spinner */}
      {uploadState === 'uploading' && (
        <div className="flex items-center justify-center py-4 gap-3">
          <LoadingSpinner />
          <span className="text-gray-600 dark:text-gray-400">Wird hochgeladen...</span>
        </div>
      )}

      {/* Upload state: success - show checkmark */}
      {uploadState === 'success' && (
        <div className="flex items-center justify-center py-4 gap-3 text-green-600">
          <CheckIcon className="w-6 h-6" />
          <span>Erfolgreich hochgeladen</span>
        </div>
      )}

      {/* Upload state: error - show error and retry */}
      {uploadState === 'error' && (
        <div className="space-y-3">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMessage || 'Ein Fehler ist aufgetreten'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={handleCancel}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              onClick={handleRetry}
            >
              Erneut versuchen
            </Button>
          </div>
        </div>
      )}

      {/* Max photos reached message */}
      {!canUpload && !disabled && photosCount >= maxPhotos && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Maximale Anzahl erreicht
        </p>
      )}

      {/* Generic error message display */}
      {uploadState === 'idle' && errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        </div>
      )}
    </div>
  )
}

// Icon components
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  )
}

function GalleryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
