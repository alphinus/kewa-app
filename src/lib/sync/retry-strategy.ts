/**
 * Retry Strategy with Exponential Backoff
 *
 * Provides exponential backoff for failed operations.
 * Max 8 attempts (depth 0-7): 0ms, 10ms, 20ms, 40ms, 80ms, 160ms, 320ms, 640ms
 * Phase: 28-offline-data-sync
 */

export const MAX_RETRY_DEPTH = 7

/**
 * Wait for specified milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute function with exponential backoff retry
 *
 * @param fn - Function to execute
 * @param maxDepth - Maximum retry depth (default 7 = 8 total attempts)
 * @returns Result of successful execution
 * @throws Error from final failed attempt
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxDepth = MAX_RETRY_DEPTH
): Promise<T> {
  let depth = 0
  let lastError: Error | null = null

  while (depth <= maxDepth) {
    try {
      // Wait before retry (depth 0 = no delay for first attempt)
      if (depth > 0) {
        const delayMs = Math.pow(2, depth) * 10
        await wait(delayMs)
      }

      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      depth++
    }
  }

  // All retries exhausted
  throw lastError || new Error('Max retries exceeded')
}
