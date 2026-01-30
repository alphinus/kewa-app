'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { validateAttachment, uploadTicketAttachment, MAX_TICKET_PHOTOS } from '@/lib/portal/attachment-upload'
import type { TicketCategory, TicketUrgency } from '@/types/portal'

/**
 * New ticket creation form
 * Category, urgency, title, description, photo uploads
 */
export default function NewTicketPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [urgency, setUrgency] = useState<TicketUrgency>('normal')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/portal/categories', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || [])
        if (data.categories?.length > 0) {
          setCategoryId(data.categories[0].id)
        }
      })
      .catch(() => toast.error('Kategorien konnten nicht geladen werden'))
  }, [])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Validate each file
    for (const file of files) {
      const validation = validateAttachment(file, 'tenant')
      if (!validation.valid) {
        toast.error(validation.error)
        return
      }
    }

    // Check total count
    if (photos.length + files.length > MAX_TICKET_PHOTOS) {
      toast.error(`Maximal ${MAX_TICKET_PHOTOS} Fotos erlaubt`)
      return
    }

    setPhotos((prev) => [...prev, ...files])
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryId || !title.trim() || !description.trim()) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus')
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Create ticket
      const ticketResponse = await fetch('/api/portal/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          title: title.trim(),
          description: description.trim(),
          urgency,
        }),
      })

      if (!ticketResponse.ok) {
        throw new Error('Ticket konnte nicht erstellt werden')
      }

      const { ticket } = await ticketResponse.json()

      // 2. Upload photos if any
      if (photos.length > 0) {
        for (const photo of photos) {
          const { path } = await uploadTicketAttachment(photo, ticket.id)

          // Create attachment record
          await fetch(`/api/portal/tickets/${ticket.id}/attachments`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storagePath: path,
              fileName: photo.name,
              fileSize: photo.size,
              mimeType: photo.type,
            }),
          })
        }
      }

      toast.success('Ticket erfolgreich erstellt')
      router.push(`/portal/tickets/${ticket.id}`)
    } catch (error) {
      console.error('Error creating ticket:', error)
      toast.error('Fehler beim Erstellen des Tickets')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Neues Ticket</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Kategorie *
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            required
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dringlichkeit *
          </label>
          <div className="space-y-2">
            {(['normal', 'dringend', 'notfall'] as TicketUrgency[]).map((urg) => (
              <label
                key={urg}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  urgency === urg
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${urg === 'notfall' ? 'border-red-300 hover:border-red-400' : ''}`}
              >
                <input
                  type="radio"
                  name="urgency"
                  value={urg}
                  checked={urgency === urg}
                  onChange={(e) => setUrgency(e.target.value as TicketUrgency)}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-blue-600"
                />
                <span className={`font-medium ${urg === 'notfall' ? 'text-red-700' : ''}`}>
                  {urg === 'normal' && 'Normal'}
                  {urg === 'dringend' && 'Dringend'}
                  {urg === 'notfall' && 'Notfall'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Titel *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/200</p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Beschreibung *
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={isSubmitting}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{description.length}/2000</p>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fotos (optional, max. {MAX_TICKET_PHOTOS})
          </label>

          {/* Photo previews */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={photo.name}
                    className="w-full h-24 object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Photo upload button */}
          {photos.length < MAX_TICKET_PHOTOS && (
            <label className="flex items-center justify-center w-full min-h-[48px] px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
              <span className="text-sm text-gray-600">Fotos hinzufügen</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
                disabled={isSubmitting}
              />
            </label>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 min-h-[48px] px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 min-h-[48px] px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Wird erstellt...' : 'Ticket erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
