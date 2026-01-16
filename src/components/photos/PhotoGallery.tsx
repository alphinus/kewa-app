'use client'

import { useState, useCallback } from 'react'
import type { TaskPhotoWithUrl } from '@/types/database'

interface PhotoGalleryProps {
  photos: TaskPhotoWithUrl[]
  onPhotoClick?: (photo: TaskPhotoWithUrl) => void
  emptyMessage?: string
}

/**
 * Simple photo grid display
 * 2 columns on mobile, 4 on desktop
 * Click to open full-size
 */
export function PhotoGallery({
  photos,
  onPhotoClick,
  emptyMessage = 'Keine Fotos',
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<TaskPhotoWithUrl | null>(null)

  /**
   * Handle photo click - open in lightbox or custom handler
   */
  const handlePhotoClick = useCallback((photo: TaskPhotoWithUrl) => {
    if (onPhotoClick) {
      onPhotoClick(photo)
    } else {
      setSelectedPhoto(photo)
    }
  }, [onPhotoClick])

  /**
   * Close lightbox
   */
  const closeLightbox = useCallback(() => {
    setSelectedPhoto(null)
  }, [])

  /**
   * Handle lightbox backdrop click
   */
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeLightbox()
    }
  }, [closeLightbox])

  /**
   * Handle keyboard events for lightbox
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeLightbox()
    }
  }, [closeLightbox])

  if (photos.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        {emptyMessage}
      </p>
    )
  }

  return (
    <>
      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => handlePhotoClick(photo)}
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <img
              src={photo.url}
              alt={photo.file_name}
              className="w-full h-full object-cover transition-transform hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Lightbox (built-in if no custom handler) */}
      {selectedPhoto && !onPhotoClick && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Foto Vollansicht"
          tabIndex={0}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.file_name}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={closeLightbox}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Schliessen"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}
