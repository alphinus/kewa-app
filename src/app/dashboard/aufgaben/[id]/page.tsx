'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BeforeAfterView } from '@/components/photos/BeforeAfterView'
import { PhotoUpload } from '@/components/photos/PhotoUpload'
import { AudioRecorder } from '@/components/audio/AudioRecorder'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import { CompleteTaskModal } from '@/components/tasks/CompleteTaskModal'
import { TaskForm } from '@/components/tasks/TaskForm'
import type { TaskWithProject, TaskPhotoWithUrl, PhotosResponse, TaskAudioWithUrl, AudiosResponse } from '@/types/database'
import type { Priority, Role } from '@/types'

/**
 * Priority badge styling
 */
function getPriorityBadge(priority: Priority): { label: string; className: string } {
  switch (priority) {
    case 'urgent':
      return {
        label: 'Dringend',
        className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      }
    case 'high':
      return {
        label: 'Hoch',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      }
    case 'normal':
      return {
        label: 'Normal',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      }
    case 'low':
      return {
        label: 'Niedrig',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      }
  }
}

/**
 * Status badge styling
 */
function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'open':
      return {
        label: 'Offen',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      }
    case 'completed':
      return {
        label: 'Erledigt',
        className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      }
    default:
      return {
        label: status,
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      }
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format datetime for display
 */
function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Task detail page
 * Shows task info, photos, and role-appropriate actions
 */
export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  // State
  const [task, setTask] = useState<TaskWithProject | null>(null)
  const [photos, setPhotos] = useState<TaskPhotoWithUrl[]>([])
  const [audios, setAudios] = useState<TaskAudioWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [photosLoading, setPhotosLoading] = useState(true)
  const [audiosLoading, setAudiosLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<Role | null>(null)

  // Modal states
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  // Derived photo arrays
  const explanationPhotos = photos.filter((p) => p.photo_type === 'explanation')
  const completionPhotos = photos.filter((p) => p.photo_type === 'completion')

  // Derived audio arrays
  const explanationAudio = audios.find((a) => a.audio_type === 'explanation')
  const emergencyAudio = audios.find((a) => a.audio_type === 'emergency')

  /**
   * Fetch task details
   */
  const fetchTask = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/tasks/${taskId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Aufgabe nicht gefunden')
        }
        throw new Error('Fehler beim Laden der Aufgabe')
      }

      const data = await response.json()
      setTask(data.task)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  /**
   * Fetch photos for this task
   */
  const fetchPhotos = useCallback(async () => {
    try {
      setPhotosLoading(true)

      const response = await fetch(`/api/photos?task_id=${taskId}`)
      if (response.ok) {
        const data: PhotosResponse = await response.json()
        setPhotos(data.photos)
      }
    } catch (err) {
      console.error('Error fetching photos:', err)
    } finally {
      setPhotosLoading(false)
    }
  }, [taskId])

  /**
   * Fetch audio for this task
   */
  const fetchAudios = useCallback(async () => {
    try {
      setAudiosLoading(true)

      const response = await fetch(`/api/audio?task_id=${taskId}`)
      if (response.ok) {
        const data: AudiosResponse = await response.json()
        setAudios(data.audios)
      }
    } catch (err) {
      console.error('Error fetching audio:', err)
    } finally {
      setAudiosLoading(false)
    }
  }, [taskId])

  /**
   * Get current user role from session
   */
  const fetchUserRole = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        setUserRole(data.role || null)
      }
    } catch (err) {
      console.error('Error fetching user role:', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchTask()
    fetchPhotos()
    fetchAudios()
    fetchUserRole()
  }, [fetchTask, fetchPhotos, fetchAudios, fetchUserRole])

  /**
   * Handle photo upload complete
   */
  const handlePhotoUpload = useCallback((photo: TaskPhotoWithUrl) => {
    setPhotos((prev) => [...prev, photo])
  }, [])

  /**
   * Handle photo delete
   */
  const handlePhotoDelete = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
  }, [])

  /**
   * Handle audio upload complete
   */
  const handleAudioUpload = useCallback((audio: TaskAudioWithUrl) => {
    setAudios((prev) => [...prev, audio])
  }, [])

  /**
   * Handle audio delete
   */
  const handleAudioDelete = useCallback((audioId: string) => {
    setAudios((prev) => prev.filter((a) => a.id !== audioId))
  }, [])

  /**
   * Handle task completion
   */
  const handleComplete = useCallback(() => {
    setShowCompleteModal(false)
    fetchTask()
    fetchPhotos()
    fetchAudios()
  }, [fetchTask, fetchPhotos, fetchAudios])

  /**
   * Handle task edit save
   */
  const handleEditSave = useCallback(() => {
    setShowEditForm(false)
    fetchTask()
  }, [fetchTask])

  /**
   * Handle task delete (from edit form)
   */
  const handleDelete = useCallback(() => {
    setShowEditForm(false)
    router.push('/dashboard/aufgaben')
  }, [router])

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  // Error state
  if (error || !task) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500">{error || 'Aufgabe nicht gefunden'}</p>
            <button
              onClick={() => router.push('/dashboard/aufgaben')}
              className="mt-4 text-blue-500 underline"
            >
              Zurueck zur Uebersicht
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const priorityBadge = getPriorityBadge(task.priority)
  const statusBadge = getStatusBadge(task.status)
  const isCompleted = task.status === 'completed'
  const isKewa = userRole === 'kewa'
  const isImeri = userRole === 'imeri'

  return (
    <div className="space-y-4 pb-40 relative">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 min-h-[48px]"
      >
        <ChevronLeftIcon className="w-5 h-5 mr-1" />
        Zurueck
      </button>

      {/* Task header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Title and badges */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {task.title}
            </h1>
            <div className="flex gap-2 flex-shrink-0">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityBadge.className}`}>
                {priorityBadge.label}
              </span>
            </div>
          </div>

          {/* Location breadcrumb */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {task.unit.name} &rarr; {task.project.name}
          </p>

          {/* Due date */}
          {task.due_date && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Faellig:</span> {formatDate(task.due_date)}
            </p>
          )}

          {/* Completion info */}
          {isCompleted && task.completed_at && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-green-600 dark:text-green-400">
                <span className="font-medium">Erledigt:</span> {formatDateTime(task.completed_at)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task description */}
      {task.description && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Beschreibung
            </h2>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {task.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Completion note */}
      {isCompleted && task.completion_note && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Erledigungsnotiz
            </h2>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {task.completion_note}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Photo documentation section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Foto-Dokumentation
          </h2>

          {photosLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2 text-gray-500 dark:text-gray-400">Fotos werden geladen...</span>
            </div>
          ) : (
            <>
              {/* Completed task: Show before/after comparison */}
              {isCompleted && (
                <BeforeAfterView
                  explanationPhotos={explanationPhotos}
                  completionPhotos={completionPhotos}
                />
              )}

              {/* Open task: Show appropriate content based on role */}
              {!isCompleted && (
                <div className="space-y-6">
                  {/* KEWA: Edit explanation photos */}
                  {isKewa && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Erklaerungsfotos
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          fuer Imeri sichtbar
                        </span>
                      </div>
                      <PhotoUpload
                        taskId={task.id}
                        photoType="explanation"
                        maxPhotos={2}
                        existingPhotos={explanationPhotos}
                        onUploadComplete={handlePhotoUpload}
                        onDelete={handlePhotoDelete}
                      />
                    </div>
                  )}

                  {/* Imeri: View-only explanation photos */}
                  {isImeri && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Erklaerungsfotos von KEWA AG
                      </h3>
                      {explanationPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {explanationPhotos.map((photo) => (
                            <div key={photo.id} className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                              <img
                                src={photo.url}
                                alt={photo.file_name}
                                className="w-full h-32 object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Keine Erklaerungsfotos vorhanden
                          </p>
                        </div>
                      )}

                      {/* Hint for completion photos */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Erledigungsfotos werden beim Abschliessen der Aufgabe hochgeladen.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Audio documentation section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Sprachnotizen
          </h2>

          {audiosLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2 text-gray-500 dark:text-gray-400">Sprachnotizen werden geladen...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Explanation audio section - KEWA records, both can view */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Erklaerung von KEWA AG
                  </h3>
                </div>

                {/* KEWA: Can record explanation audio if not completed */}
                {isKewa && !isCompleted && (
                  <AudioRecorder
                    taskId={task.id}
                    audioType="explanation"
                    existingAudio={explanationAudio}
                    onRecordComplete={handleAudioUpload}
                    onDelete={handleAudioDelete}
                  />
                )}

                {/* KEWA completed task: Show existing audio player */}
                {isKewa && isCompleted && explanationAudio && (
                  <AudioPlayer audio={explanationAudio} showTranscription={true} />
                )}

                {/* Imeri: View-only explanation audio */}
                {isImeri && explanationAudio && (
                  <AudioPlayer audio={explanationAudio} showTranscription={true} />
                )}

                {/* No explanation audio message */}
                {!explanationAudio && (isImeri || (isKewa && isCompleted)) && (
                  <div className="py-4 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Keine Erklaerung vorhanden
                    </p>
                  </div>
                )}
              </div>

              {/* Emergency audio section - Imeri records, both can view */}
              {(emergencyAudio || isImeri) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notfall-Notiz
                    </h3>
                  </div>

                  {/* Imeri: Can record emergency audio */}
                  {isImeri && (
                    <AudioRecorder
                      taskId={task.id}
                      audioType="emergency"
                      existingAudio={emergencyAudio}
                      onRecordComplete={handleAudioUpload}
                      onDelete={handleAudioDelete}
                    />
                  )}

                  {/* KEWA: View-only emergency audio */}
                  {isKewa && emergencyAudio && (
                    <AudioPlayer audio={emergencyAudio} showTranscription={false} />
                  )}

                  {/* No emergency audio for KEWA */}
                  {isKewa && !emergencyAudio && (
                    <div className="py-4 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Keine Notfall-Notiz vorhanden
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sticky bottom action bar - positioned above MobileNav (h-16) */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40 shadow-lg">
        <div className="max-w-lg mx-auto flex gap-3">
          {/* KEWA: Edit button (if open) */}
          {isKewa && !isCompleted && (
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setShowEditForm(true)}
            >
              Bearbeiten
            </Button>
          )}

          {/* Imeri: Complete button (if open) */}
          {isImeri && !isCompleted && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setShowCompleteModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              Als erledigt markieren
            </Button>
          )}

          {/* Completed: View only indicator */}
          {isCompleted && (
            <div className="flex-1 text-center py-3 text-green-600 dark:text-green-400 font-medium">
              <CheckIcon className="w-5 h-5 inline-block mr-2" />
              Aufgabe erledigt
            </div>
          )}
        </div>
      </div>

      {/* Complete task modal */}
      {showCompleteModal && (
        <CompleteTaskModal
          task={task}
          onClose={() => setShowCompleteModal(false)}
          onComplete={handleComplete}
        />
      )}

      {/* Edit task form */}
      {showEditForm && (
        <TaskForm
          mode="edit"
          task={task}
          onSave={handleEditSave}
          onCancel={() => setShowEditForm(false)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// Icon components
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-gray-500"
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
