/**
 * Transcription service using OpenAI Whisper API
 *
 * Provides automatic transcription of audio files to German (Hochdeutsch).
 * Used for KEWA's explanation audio so Imeri can read instructions.
 */

/**
 * Result of a transcription attempt
 */
export interface TranscriptionResult {
  success: boolean
  transcription?: string
  error?: string
}

// Whisper API endpoint
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions'

// Timeout for transcription requests (30 seconds)
const TRANSCRIPTION_TIMEOUT_MS = 30000

/**
 * Transcribe audio using OpenAI Whisper API
 *
 * @param audioBuffer - The audio file as Buffer or ArrayBuffer
 * @param fileName - Original filename (used for format detection)
 * @returns TranscriptionResult with success status and transcription or error
 *
 * @example
 * ```typescript
 * const result = await transcribeAudio(buffer, 'explanation.webm')
 * if (result.success) {
 *   console.log('Transcription:', result.transcription)
 * } else {
 *   console.error('Failed:', result.error)
 * }
 * ```
 */
export async function transcribeAudio(
  audioBuffer: Buffer | ArrayBuffer,
  fileName: string
): Promise<TranscriptionResult> {
  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: 'OPENAI_API_KEY environment variable is not set',
    }
  }

  try {
    // Convert to ArrayBuffer for Blob creation (handles both Buffer and ArrayBuffer)
    let arrayBuffer: ArrayBuffer
    if (audioBuffer instanceof ArrayBuffer) {
      arrayBuffer = audioBuffer
    } else {
      // Buffer - extract the underlying ArrayBuffer slice
      arrayBuffer = audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength
      ) as ArrayBuffer
    }

    // Determine content type from filename
    const contentType = getContentType(fileName)
    const blob = new Blob([arrayBuffer], { type: contentType })

    // Build FormData
    const formData = new FormData()
    formData.append('file', blob, fileName)
    formData.append('model', 'whisper-1')
    formData.append('language', 'de') // German (Hochdeutsch)
    formData.append('response_format', 'text')

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS)

    try {
      const response = await fetch(WHISPER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Try to get error message from API
        let errorMessage = `API error: ${response.status} ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData.error?.message) {
            errorMessage = errorData.error.message
          }
        } catch {
          // Ignore JSON parse errors, use default message
        }

        return {
          success: false,
          error: errorMessage,
        }
      }

      // Response format is 'text', so we get plain text back
      const transcription = await response.text()

      return {
        success: true,
        transcription: transcription.trim(),
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      throw fetchError
    }
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Transcription request timed out after 30 seconds',
        }
      }
      return {
        success: false,
        error: `Network error: ${error.message}`,
      }
    }

    return {
      success: false,
      error: 'Unknown error occurred during transcription',
    }
  }
}

/**
 * Get content type from filename extension
 */
function getContentType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  const contentTypes: Record<string, string> = {
    webm: 'audio/webm',
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
  }
  return contentTypes[extension || ''] || 'audio/webm'
}
