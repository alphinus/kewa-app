/**
 * Photo Gallery Component
 *
 * Grid of photo thumbnails with lightbox viewer and delete functionality.
 * Phase 21-03: Photo Evidence and PDF Generation
 */

'use client'

import { useState } from 'react'
import { X, Trash2, ZoomIn } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

interface Photo {
  id: string
  filename: string
  caption: string | null
  signedUrl: string | null
  uploaded_at: string
}

interface PhotoGalleryProps {
  photos: Photo[]
  changeOrderId: string
  onDelete?: (photoId: string) => void
}

export function PhotoGallery({ photos, changeOrderId, onDelete }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (photoId: string) => {
    if (!confirm('Möchten Sie dieses Foto wirklich löschen?')) {
      return
    }

    setDeleting(photoId)

    try {
      const response = await fetch(
        `/api/change-orders/${changeOrderId}/photos?photo_id=${photoId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Löschen fehlgeschlagen')
      }

      onDelete?.(photoId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
    } finally {
      setDeleting(null)
    }
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500">Noch keine Fotos hochgeladen</p>
      </div>
    )
  }

  return (
    <>
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {/* Photo */}
            {photo.signedUrl ? (
              <img
                src={photo.signedUrl}
                alt={photo.caption || photo.filename}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <p className="text-sm">Bild nicht verfügbar</p>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                onClick={() => setSelectedPhoto(photo)}
                className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                title="Vergrössern"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deleting === photo.id}
                className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Löschen"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>

            {/* Caption */}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 px-2 py-1">
                <p className="text-xs text-white truncate">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-5xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Image */}
            {selectedPhoto.signedUrl && (
              <img
                src={selectedPhoto.signedUrl}
                alt={selectedPhoto.caption || selectedPhoto.filename}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            )}

            {/* Caption */}
            {selectedPhoto.caption && (
              <div className="mt-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-4 py-3">
                <p className="text-white text-center">{selectedPhoto.caption}</p>
              </div>
            )}

            {/* Filename */}
            <div className="mt-2 text-center">
              <p className="text-sm text-gray-400">{selectedPhoto.filename}</p>
              <p className="text-xs text-gray-500">
                {new Date(selectedPhoto.uploaded_at).toLocaleString('de-CH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
