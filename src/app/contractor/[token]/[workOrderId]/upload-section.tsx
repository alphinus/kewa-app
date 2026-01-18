'use client'

/**
 * UploadSection Component
 *
 * Section in work order detail for contractor file uploads.
 * Features:
 * - Tabs for Photos and Documents
 * - Context selector (completion, offer, invoice, other)
 * - FileUploader instance for each tab
 * - Count badge showing uploaded items
 */

import { useState, useCallback, useEffect } from 'react'
import FileUploader from '@/components/upload/FileUploader'
import {
  type UploadMediaType,
  type UploadContext,
  CONTEXT_LABELS,
} from '@/lib/storage/contractor-upload'

interface MediaItem {
  id: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  media_type: string
  context: string
  url: string
}

interface UploadSectionProps {
  token: string
  workOrderId: string
  /** Work order status - affects whether uploads/deletes are allowed */
  workOrderStatus: string
}

type TabType = 'photos' | 'documents'

export default function UploadSection({
  token,
  workOrderId,
  workOrderStatus,
}: UploadSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('photos')
  const [photoContext, setPhotoContext] = useState<UploadContext>('completion')
  const [docContext, setDocContext] = useState<UploadContext>('offer')
  const [photos, setPhotos] = useState<MediaItem[]>([])
  const [documents, setDocuments] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  // Check if uploads/deletes are allowed
  const uploadsAllowed = ['accepted', 'in_progress', 'done'].includes(workOrderStatus)
  const deletesAllowed = ['accepted', 'in_progress'].includes(workOrderStatus)

  // Load existing media
  useEffect(() => {
    const loadMedia = async () => {
      try {
        const response = await fetch(
          `/api/contractor/${token}/${workOrderId}/media`
        )
        if (response.ok) {
          const data = await response.json()
          const mediaList = data.media || []

          setPhotos(mediaList.filter((m: MediaItem) => m.media_type === 'photo'))
          setDocuments(mediaList.filter((m: MediaItem) => m.media_type === 'document'))
        }
      } catch (error) {
        console.error('Failed to load media:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMedia()
  }, [token, workOrderId])

  // Handle upload
  const handleUpload = useCallback(
    async (
      file: File,
      mediaType: UploadMediaType,
      context: UploadContext
    ): Promise<{ id: string; url: string } | null> => {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', mediaType)
        formData.append('context', context)

        const response = await fetch(
          `/api/contractor/${token}/${workOrderId}/upload`,
          {
            method: 'POST',
            body: formData,
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload fehlgeschlagen')
        }

        const data = await response.json()
        const newMedia = data.media

        // Add to appropriate list
        if (mediaType === 'photo') {
          setPhotos((prev) => [newMedia, ...prev])
        } else {
          setDocuments((prev) => [newMedia, ...prev])
        }

        return { id: newMedia.id, url: newMedia.url }
      } catch (error) {
        console.error('Upload failed:', error)
        alert(error instanceof Error ? error.message : 'Upload fehlgeschlagen')
        return null
      }
    },
    [token, workOrderId]
  )

  // Handle delete
  const handleDelete = useCallback(
    async (mediaId: string, mediaType: UploadMediaType): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/contractor/${token}/${workOrderId}/media`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaId }),
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Loeschen fehlgeschlagen')
        }

        // Remove from appropriate list
        if (mediaType === 'photo') {
          setPhotos((prev) => prev.filter((p) => p.id !== mediaId))
        } else {
          setDocuments((prev) => prev.filter((d) => d.id !== mediaId))
        }

        return true
      } catch (error) {
        console.error('Delete failed:', error)
        alert(error instanceof Error ? error.message : 'Loeschen fehlgeschlagen')
        return false
      }
    },
    [token, workOrderId]
  )

  // Photo context options
  const photoContextOptions: UploadContext[] = ['completion', 'before', 'after', 'during', 'other']
  // Document context options
  const docContextOptions: UploadContext[] = ['offer', 'invoice', 'other']

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Dateien hochladen</h3>
        <p className="text-sm text-gray-500 mt-1">
          Laden Sie Fotos und Dokumente zu diesem Auftrag hoch
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('photos')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
            activeTab === 'photos'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Fotos
          {photos.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
              {photos.length}
            </span>
          )}
          {activeTab === 'photos' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
            activeTab === 'documents'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Dokumente
          {documents.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
              {documents.length}
            </span>
          )}
          {activeTab === 'documents' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'photos' ? (
          <div className="space-y-4">
            {/* Context selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto-Typ
              </label>
              <div className="flex flex-wrap gap-2">
                {photoContextOptions.map((ctx) => (
                  <button
                    key={ctx}
                    type="button"
                    onClick={() => setPhotoContext(ctx)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      photoContext === ctx
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {CONTEXT_LABELS[ctx]}
                  </button>
                ))}
              </div>
            </div>

            {/* Uploader */}
            <FileUploader
              mediaType="photo"
              onUpload={(file) => handleUpload(file, 'photo', photoContext)}
              onDelete={deletesAllowed ? (id) => handleDelete(id, 'photo') : undefined}
              initialFiles={photos.map((p) => ({
                id: p.id,
                name: p.file_name,
                size: p.file_size || 0,
                type: p.mime_type || 'image/jpeg',
                url: p.url,
              }))}
              showCamera={true}
              maxFiles={20}
              disabled={!uploadsAllowed}
              label={`${CONTEXT_LABELS[photoContext]}-Fotos hochladen`}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Context selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokument-Typ
              </label>
              <div className="flex flex-wrap gap-2">
                {docContextOptions.map((ctx) => (
                  <button
                    key={ctx}
                    type="button"
                    onClick={() => setDocContext(ctx)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      docContext === ctx
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {CONTEXT_LABELS[ctx]}
                  </button>
                ))}
              </div>
            </div>

            {/* Uploader */}
            <FileUploader
              mediaType="document"
              onUpload={(file) => handleUpload(file, 'document', docContext)}
              onDelete={deletesAllowed ? (id) => handleDelete(id, 'document') : undefined}
              initialFiles={documents.map((d) => ({
                id: d.id,
                name: d.file_name,
                size: d.file_size || 0,
                type: d.mime_type || 'application/pdf',
                url: d.url,
              }))}
              maxFiles={10}
              disabled={!uploadsAllowed}
              label={`${CONTEXT_LABELS[docContext]} hochladen`}
            />
          </div>
        )}

        {/* Status warning */}
        {!uploadsAllowed && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Uploads sind nur moeglich, wenn der Auftrag akzeptiert, in Bearbeitung oder erledigt ist.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
