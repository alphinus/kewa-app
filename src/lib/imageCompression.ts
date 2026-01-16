/**
 * Browser-side image compression utility
 *
 * Uses Canvas API to resize and compress images before upload.
 * Target: 720px max dimension, WebP format, ~50-100KB output from phone photos.
 */

export interface CompressionOptions {
  /** Maximum width in pixels (default: 720) */
  maxWidth?: number
  /** Maximum height in pixels (default: 720) */
  maxHeight?: number
  /** Quality 0-1 (default: 0.8) */
  quality?: number
  /** Output format (default: 'webp', falls back to 'jpeg' if unsupported) */
  outputFormat?: 'webp' | 'jpeg'
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 720,
  maxHeight: 720,
  quality: 0.8,
  outputFormat: 'webp',
}

/**
 * Check if the browser supports WebP encoding via Canvas
 */
export function supportsWebP(): boolean {
  if (typeof document === 'undefined') {
    // Server-side, assume no support
    return false
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1

  return canvas.toDataURL('image/webp').startsWith('data:image/webp')
}

/**
 * Load a File as an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Calculate target dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // If image is smaller than max dimensions, keep original size
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }

  // Calculate scale factor to fit within max dimensions
  const widthRatio = maxWidth / width
  const heightRatio = maxHeight / height
  const scale = Math.min(widthRatio, heightRatio)

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

/**
 * Compress an image file using Canvas API
 *
 * @param file - The image File to compress
 * @param options - Compression options (maxWidth, maxHeight, quality, outputFormat)
 * @returns Compressed image as Blob
 *
 * @example
 * const file = inputElement.files[0]
 * const compressed = await compressImage(file, { maxWidth: 720, quality: 0.8 })
 * // compressed is a Blob ready for upload
 */
export async function compressImage(
  file: File,
  options?: CompressionOptions
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Load image
  const img = await loadImage(file)

  // Calculate target dimensions
  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    opts.maxWidth,
    opts.maxHeight
  )

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Draw image
  ctx.drawImage(img, 0, 0, width, height)

  // Determine output format (fallback to JPEG if WebP not supported)
  let format = opts.outputFormat
  if (format === 'webp' && !supportsWebP()) {
    format = 'jpeg'
  }

  const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg'

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to compress image'))
        }
      },
      mimeType,
      opts.quality
    )
  })
}

/**
 * Get the appropriate file extension for the compressed image
 */
export function getCompressedExtension(): string {
  return supportsWebP() ? 'webp' : 'jpg'
}

/**
 * Get the MIME type for the compressed image
 */
export function getCompressedMimeType(): string {
  return supportsWebP() ? 'image/webp' : 'image/jpeg'
}
