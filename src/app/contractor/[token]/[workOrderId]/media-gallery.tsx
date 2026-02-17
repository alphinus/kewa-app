'use client'

/**
 * MediaGallery Component
 *
 * Displays uploaded media files for a work order.
 * Features:
 * - Grid display of uploaded photos
 * - List display for documents
 * - Lightbox for photo viewing
 * - Download link for documents
 * - Delete option if status allows
 */

import { useState, useEffect, useCallback } from 'react'
import { formatFileSize, CONTEXT_LABELS, type UploadContext } from '@/lib/storage/contractor-upload'
import { toast } from 'sonner'

interface MediaItem {
  id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  media_type: string
  context: string
  created_at: string
  url: string
}

interface MediaGalleryProps {
  token: string
  workOrderId: string
  /** Work order status - affects delete option */
  workOrderStatus: string
  /** Whether to show in read-only mode */
  readOnly?: boolean
}

export default function MediaGallery({
  token,
  workOrderId,
  workOrderStatus,
  readOnly = false,
}: MediaGalleryProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'photo' | 'document'>('all')

  // Check if deletes are allowed
  const deletesAllowed =
    !readOnly && ['accepted', 'in_progress'].includes(workOrderStatus)

  // Load media
  useEffect(() => {
    const loadMedia = async () => {
      try {
        const response = await fetch(
          `/api/contractor/${token}/${workOrderId}/media`
        )
        if (response.ok) {
          const data = await response.json()
          setMedia(data.media || [])
        }
      } catch (error) {
        console.error('Failed to load media:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMedia()
  }, [token, workOrderId])

  // Handle delete
  const handleDelete = useCallback(
    async (mediaId: string) => {
      if (!confirm('Datei wirklich löschen?')) return

      try {
        const response = await fetch(
          `/api/contractor/${token}/${workOrderId}/media`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaId }),
          }
        )

        if (response.ok) {
          setMedia((prev) => prev.filter((m) => m.id !== mediaId))
        } else {
          const error = await response.json()
          toast.error(error.error || 'Löschen fehlgeschlagen')
        }
      } catch {
        toast.error('Löschen fehlgeschlagen')
      }
    },
    [token, workOrderId]
  )

  // Filter media
  const filteredMedia = media.filter((m) => {
    if (filter === 'all') return true
    return m.media_type === filter
  })

  const photos = filteredMedia.filter((m) => m.media_type === 'photo')
  const documents = filteredMedia.filter((m) => m.media_type === 'document')

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get context label with fallback
  const getContextLabel = (context: string) => {
    return CONTEXT_LABELS[context as UploadContext] || context
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (media.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-500">Keine Dateien hochgeladen</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Hochgeladene Dateien ({media.length})
          </h3>

          {/* Filter buttons */}
          <div className="flex gap-1">
            <FilterButton
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              count={media.length}
            >
              Alle
            </FilterButton>
            <FilterButton
              active={filter === 'photo'}
              onClick={() => setFilter('photo')}
              count={media.filter((m) => m.media_type === 'photo').length}
            >
              Fotos
            </FilterButton>
            <FilterButton
              active={filter === 'document'}
              onClick={() => setFilter('document')}
              count={media.filter((m) => m.media_type === 'document').length}
            >
              Docs
            </FilterButton>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Photos grid */}
        {photos.length > 0 && (filter === 'all' || filter === 'photo') && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Fotos ({photos.length})
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => setLightboxIndex(index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.file_name}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                  {/* Context badge */}
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 text-xs bg-black/50 text-white rounded">
                    {getContextLabel(photo.context)}
                  </span>
                  {/* Delete button */}
                  {deletesAllowed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(photo.id)
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Löschen"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents list */}
        {documents.length > 0 && (filter === 'all' || filter === 'document') && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Dokumente ({documents.length})
            </h4>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {/* PDF icon */}
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {doc.file_name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {getContextLabel(doc.context)} &middot;{' '}
                      {formatFileSize(doc.file_size || 0)} &middot;{' '}
                      {formatDate(doc.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Download */}
                    <a
                      href={doc.url}
                      download={doc.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Herunterladen"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </a>
                    {/* Delete */}
                    {deletesAllowed && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Löschen"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrevious={() =>
            setLightboxIndex((prev) =>
              prev !== null ? (prev > 0 ? prev - 1 : photos.length - 1) : null
            )
          }
          onNext={() =>
            setLightboxIndex((prev) =>
              prev !== null ? (prev < photos.length - 1 ? prev + 1 : 0) : null
            )
          }
        />
      )}
    </div>
  )
}

// Filter button component
function FilterButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
      {count > 0 && (
        <span className="ml-1 opacity-75">({count})</span>
      )}
    </button>
  )
}

// Lightbox component
function Lightbox({
  photos,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
}: {
  photos: MediaItem[]
  currentIndex: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}) {
  const currentPhoto = photos[currentIndex]

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrevious()
      if (e.key === 'ArrowRight') onNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onPrevious, onNext])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPrevious()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors"
          >
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors"
          >
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentPhoto.url}
          alt={currentPhoto.file_name}
          className="max-w-full max-h-[90vh] object-contain"
        />

        {/* Caption */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <p className="text-white text-sm">{currentPhoto.file_name}</p>
          <p className="text-white/70 text-xs">
            {currentIndex + 1} / {photos.length}
          </p>
        </div>
      </div>
    </div>
  )
}
