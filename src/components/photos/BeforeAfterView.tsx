'use client'

import { useState, useCallback } from 'react'
import type { TaskPhotoWithUrl } from '@/types/database'

interface BeforeAfterViewProps {
  explanationPhotos: TaskPhotoWithUrl[]  // KEWA's "before" photos
  completionPhotos: TaskPhotoWithUrl[]   // Imeri's "after" photos
}

/**
 * Side-by-side comparison view for explanation vs completion photos
 * Two columns: "Erklaerung (KEWA AG)" | "Erledigung (Imeri)"
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
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
        {/* Explanation column (KEWA) */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
            Erklaerung
            <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">(KEWA AG)</span>
          </h4>
          {explanationPhotos.length > 0 ? (
            <div className="space-y-2">
              {explanationPhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => handlePhotoClick(photo)}
                  className="block w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <img
                    src={photo.url}
                    alt={photo.file_name}
                    className="w-full h-32 object-cover transition-transform hover:scale-[1.02]"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              Noch keine Fotos
            </p>
          )}
        </div>

        {/* Completion column (Imeri) */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
            Erledigung
            <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">(Imeri)</span>
          </h4>
          {completionPhotos.length > 0 ? (
            <div className="space-y-2">
              {completionPhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => handlePhotoClick(photo)}
                  className="block w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <img
                    src={photo.url}
                    alt={photo.file_name}
                    className="w-full h-32 object-cover transition-transform hover:scale-[1.02]"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              Noch keine Fotos
            </p>
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
