'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AudioPlayer } from './AudioPlayer'
import type { TaskAudioWithUrl, AudioType } from '@/types/database'

interface AudioRecorderProps {
  taskId: string
  audioType: AudioType
  existingAudio?: TaskAudioWithUrl
  onRecordComplete?: (audio: TaskAudioWithUrl) => void
  onDelete?: (audioId: string) => void
  disabled?: boolean
}

type RecordingState = 'idle' | 'recording' | 'preview' | 'uploading' | 'success' | 'error'

const MAX_DURATION_SECONDS = 60
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// Preferred MIME types in order of preference
const MIME_TYPES = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav']

/**
 * Get the first supported MIME type for recording
 */
function getSupportedMimeType(): string {
  for (const mimeType of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType
    }
  }
  return '' // Let browser choose
}

/**
 * Audio recording component with preview, upload, and existing audio display
 * Features: 60s max duration, preview before upload, retry on failure
 */
export function AudioRecorder({
  taskId,
  audioType,
  existingAudio,
  onRecordComplete,
  onDelete,
  disabled = false,
}: AudioRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [previewUrl])

  /**
   * Format seconds as MM:SS
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null)

      // Check for MediaRecorder support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audioaufnahme wird nicht unterstuetzt')
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create MediaRecorder with supported MIME type
      const mimeType = getSupportedMimeType()
      const options = mimeType ? { mimeType } : undefined
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      // Collect data chunks
      chunksRef.current = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Create blob from chunks
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        })
        setRecordedBlob(blob)

        // Create preview URL
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        setRecordingState('preview')
      }

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setErrorMessage('Aufnahmefehler aufgetreten')
        setRecordingState('error')

        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setRecordingState('recording')
      setRecordingDuration(0)

      // Start duration timer with auto-stop at max duration
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1
          if (newDuration >= MAX_DURATION_SECONDS) {
            // Auto-stop at max duration
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop()
            }
          }
          return newDuration
        })
      }, 1000)
    } catch (err) {
      console.error('Error starting recording:', err)

      // Handle permission denied
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setErrorMessage('Mikrofonzugriff verweigert')
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Aufnahme konnte nicht gestartet werden')
      }
      setRecordingState('error')
    }
  }, [])

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  /**
   * Upload with retry logic
   */
  const uploadWithRetry = useCallback(
    async (blob: Blob, attempt = 1): Promise<TaskAudioWithUrl> => {
      const formData = new FormData()
      formData.append('file', blob, `audio.webm`)
      formData.append('task_id', taskId)
      formData.append('audio_type', audioType)
      formData.append('duration_seconds', recordingDuration.toString())

      const response = await fetch('/api/audio', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        const error = new Error(data.error || 'Upload fehlgeschlagen')

        // Retry on server errors (5xx)
        if (attempt < MAX_RETRIES && (response.status >= 500 || response.status === 0)) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)))
          return uploadWithRetry(blob, attempt + 1)
        }

        throw error
      }

      const data = await response.json()
      return data.audio
    },
    [taskId, audioType, recordingDuration]
  )

  /**
   * Handle upload
   */
  const handleUpload = useCallback(async () => {
    if (!recordedBlob) return

    try {
      setRecordingState('uploading')
      setErrorMessage(null)

      const audio = await uploadWithRetry(recordedBlob)

      setRecordingState('success')

      // Clean up preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      // Reset state after short delay to show success
      setTimeout(() => {
        setRecordingState('idle')
        setPreviewUrl(null)
        setRecordedBlob(null)
        setRecordingDuration(0)

        onRecordComplete?.(audio)
      }, 1000)
    } catch (err) {
      console.error('Upload error:', err)
      setRecordingState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    }
  }, [recordedBlob, previewUrl, uploadWithRetry, onRecordComplete])

  /**
   * Cancel preview and reset
   */
  const handleCancel = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setRecordingState('idle')
    setPreviewUrl(null)
    setRecordedBlob(null)
    setRecordingDuration(0)
    setErrorMessage(null)
  }, [previewUrl])

  /**
   * Retry after error
   */
  const handleRetry = useCallback(() => {
    if (recordedBlob) {
      handleUpload()
    } else {
      handleCancel()
    }
  }, [recordedBlob, handleUpload, handleCancel])

  /**
   * Handle delete
   */
  const handleDelete = useCallback(async () => {
    if (!existingAudio) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/audio/${existingAudio.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Löschen fehlgeschlagen')
      }

      setDeleteConfirm(false)
      onDelete?.(existingAudio.id)
    } catch (err) {
      console.error('Delete error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
    } finally {
      setDeleting(false)
    }
  }, [existingAudio, onDelete])

  // If existing audio, show player with delete option
  if (existingAudio) {
    return (
      <div className="space-y-3">
        <AudioPlayer audio={existingAudio} />
        {!disabled && (
          <div className="flex items-center justify-end">
            {deleteConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Löschen?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 min-h-[40px]"
                >
                  {deleting ? '...' : 'Ja'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 min-h-[40px]"
                >
                  Nein
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 min-h-[40px]"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="text-sm">Löschen</span>
              </button>
            )}
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Recording state: idle - show start button */}
      {recordingState === 'idle' && !disabled && (
        <Button
          type="button"
          variant="secondary"
          size="md"
          fullWidth
          onClick={startRecording}
        >
          <MicrophoneIcon className="w-5 h-5 mr-2" />
          Aufnahme starten
        </Button>
      )}

      {/* Recording state: recording - show stop button and duration */}
      {recordingState === 'recording' && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="relative">
              <span className="absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <span className="text-2xl font-mono text-gray-900 dark:text-gray-100">
                {formatDuration(recordingDuration)}
              </span>
              <span className="text-lg font-mono text-gray-500 dark:text-gray-400">
                {' '}/ {formatDuration(MAX_DURATION_SECONDS)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-700"
          >
            <StopIcon className="w-5 h-5 mr-2" />
            Aufnahme stoppen
          </Button>
          {recordingDuration >= MAX_DURATION_SECONDS - 10 && (
            <p className="text-center text-sm text-amber-600 dark:text-amber-400">
              Maximale Aufnahmedauer fast erreicht
            </p>
          )}
        </div>
      )}

      {/* Recording state: preview - show playback and buttons */}
      {recordingState === 'preview' && previewUrl && (
        <div className="space-y-3">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Vorschau
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDuration(recordingDuration)}
              </span>
            </div>
            <audio
              src={previewUrl}
              controls
              className="w-full h-10"
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

      {/* Recording state: uploading - show spinner */}
      {recordingState === 'uploading' && (
        <div className="flex items-center justify-center py-4 gap-3">
          <LoadingSpinner />
          <span className="text-gray-600 dark:text-gray-400">Wird hochgeladen...</span>
        </div>
      )}

      {/* Recording state: success - show checkmark */}
      {recordingState === 'success' && (
        <div className="flex items-center justify-center py-4 gap-3 text-green-600">
          <CheckIcon className="w-6 h-6" />
          <span>Erfolgreich hochgeladen</span>
        </div>
      )}

      {/* Recording state: error - show error and retry */}
      {recordingState === 'error' && (
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

      {/* Disabled state message */}
      {disabled && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          Aufnahme nicht verfügbar
        </p>
      )}
    </div>
  )
}

// Icon components
function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
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
