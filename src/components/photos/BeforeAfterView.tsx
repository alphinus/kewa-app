'use client'

import { useState, useCallback } from 'react'
import type { TaskPhotoWithUrl } from '@/types/database'

interface BeforeAfterViewProps {
  explanationPhotos: TaskPhotoWithUrl[]  // KEWA's "before" photos
  completionPhotos: TaskPhotoWithUrl[]   // Imeri's "after" photos
}

/**
 * Side-by-side comparison view for explanation vs completion photos
 * Two columns: "Erklärung (KEWA AG)" | "Erledigung (Imeri)"
 * Stacks vertically on very small screens (<400px)
 */
export function BeforeAfterView({
  explanationPhotos,
  completionPhotos,
}: BeforeAfterViewProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<TaskPhotoWithUrl | null>(null)

  /**
   * Open photo in lightbox
   */
  const handlePhotoClick = useCallback((photo: TaskPhotoWithUrl) => {
    setSelectedPhoto(photo)
  }, [])

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

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {/* Explanation column (KEWA) - Vorher */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Vorher
            </h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">KEWA AG</p>
          {explanationPhotos.length > 0 ? (
            <div className="space-y-2">
              {explanationPhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => handlePhotoClick(photo)}
                  className="relative block w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] transition-transform"
                >
                  <img
                    src={photo.url}
                    alt={photo.file_name}
                    className="w-full h-36 object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Keine Fotos
              </p>
            </div>
          )}
        </div>

        {/* Completion column (Imeri) - Nachher */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Nachher
            </h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Imeri</p>
          {completionPhotos.length > 0 ? (
            <div className="space-y-2">
              {completionPhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => handlePhotoClick(photo)}
                  className="relative block w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] transition-transform"
                >
                  <img
                    src={photo.url}
                    alt={photo.file_name}
                    className="w-full h-36 object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Keine Fotos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="Foto Vollansicht"
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
