'use client'

import { useState, useCallback } from 'react'
import { AudioPlayer } from './AudioPlayer'
import type { TaskAudioWithUrl, AudioType } from '@/types/database'

interface AudioGalleryProps {
  audios: TaskAudioWithUrl[]
  onSelect?: (audio: TaskAudioWithUrl) => void
  showTaskInfo?: boolean
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
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
 * Get audio type badge
 */
function getAudioTypeBadge(audioType: AudioType): { label: string; className: string } {
  switch (audioType) {
    case 'explanation':
      return {
        label: 'Erklaerung',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      }
    case 'emergency':
      return {
        label: 'Notfall',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      }
  }
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

/**
 * Audio gallery component for listing audio files
 * Features: type badges, transcription preview, expandable detail view
 */
export function AudioGallery({
  audios,
  onSelect,
  showTaskInfo = true,
}: AudioGalleryProps) {
  const [selectedAudio, setSelectedAudio] = useState<TaskAudioWithUrl | null>(null)

  /**
   * Handle audio item click
   */
  const handleSelect = useCallback(
    (audio: TaskAudioWithUrl) => {
      setSelectedAudio(audio)
      onSelect?.(audio)
    },
    [onSelect]
  )

  /**
   * Close expanded view
   */
  const handleClose = useCallback(() => {
    setSelectedAudio(null)
  }, [])

  // Empty state
  if (audios.length === 0) {
    return (
      <div className="py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <MicrophoneIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">
          Keine Sprachnotizen vorhanden
        </p>
      </div>
    )
  }

  // Sort audios by created_at (most recent first)
  const sortedAudios = [...audios].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="space-y-3">
      {/* Selected audio detail view */}
      {selectedAudio && (
        <div className="p-4 bg-white dark:bg-gray-900 border-2 border-blue-500 rounded-lg shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Ausgewaehlte Aufnahme
            </span>
            <button
              onClick={handleClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Schliessen"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
          <AudioPlayer audio={selectedAudio} showTranscription={true} />
        </div>
      )}

      {/* Audio list */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {sortedAudios.map((audio) => {
          const typeBadge = getAudioTypeBadge(audio.audio_type)
          const isSelected = selectedAudio?.id === audio.id

          return (
            <div
              key={audio.id}
              onClick={() => handleSelect(audio)}
              className={`p-4 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Play button indicator */}
                <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <PlayIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Type badge and date */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeBadge.className}`}
                    >
                      {typeBadge.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(audio.created_at)}
                    </span>
                  </div>

                  {/* Transcription preview */}
                  {audio.transcription_status === 'completed' && audio.transcription ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {truncateText(audio.transcription, 100)}
                    </p>
                  ) : audio.transcription_status === 'pending' ? (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Transkription wird vorbereitet...
                    </p>
                  ) : audio.transcription_status === 'processing' ? (
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Transkription laeuft...
                    </p>
                  ) : audio.transcription_status === 'failed' ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Transkription fehlgeschlagen
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      Keine Transkription
                    </p>
                  )}

                  {/* Duration */}
                  {audio.duration_seconds && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Dauer: {Math.floor(audio.duration_seconds / 60)}:{(audio.duration_seconds % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>

                {/* Chevron */}
                <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              </div>
            </div>
          )
        })}
      </div>
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
