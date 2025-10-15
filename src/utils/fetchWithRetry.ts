/**
 * Exponential backoff retry utility for network requests
 * Implements jitter to prevent thundering herd problem
 */

interface RetryOptions {
  retries?: number
  backoffBaseMs?: number
  maxBackoffMs?: number
  jitter?: boolean
  timeout?: number
  onRetry?: (attempt: number, error: any) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  backoffBaseMs: 300,
  maxBackoffMs: 5000,
  jitter: true,
  timeout: 8000,
  onRetry: () => {},
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateBackoff(
  attempt: number,
  baseMs: number,
  maxMs: number,
  useJitter: boolean
): number {
  // Exponential backoff: baseMs * 2^attempt
  const exponentialDelay = Math.min(baseMs * Math.pow(2, attempt), maxMs)
  
  if (!useJitter) {
    return exponentialDelay
  }
  
  // Add jitter: random value between 0 and exponentialDelay
  const jitter = Math.random() * exponentialDelay
  return Math.floor(jitter)
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch with exponential backoff retry
 * 
 * @example
 * ```ts
 * const data = await fetchWithRetry('https://api.example.com/data', {
 *   retries: 3,
 *   backoffBaseMs: 300,
 *   onRetry: (attempt, error) => {
 *     console.log(`Retry attempt ${attempt}: ${error.message}`)
 *   }
 * })
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & RetryOptions = {}
): Promise<Response> {
  const {
    retries,
    backoffBaseMs,
    maxBackoffMs,
    jitter,
    timeout,
    onRetry,
    ...fetchOptions
  } = { ...DEFAULT_OPTIONS, ...options }

  let lastError: any

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // If response is OK or non-retryable error, return it
      if (response.ok) {
        if (attempt > 0) {
          console.log(`✅ fetchWithRetry: Success after ${attempt} retries`)
        }
        return response
      }

      // Check if error is retryable
      const isRetryable = response.status >= 500 || response.status === 429
      
      if (!isRetryable) {
        console.warn(`⚠️ fetchWithRetry: Non-retryable error ${response.status}`)
        return response // Return error response for caller to handle
      }

      // Store error for potential retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)

      // If we have retries left, wait and retry
      if (attempt < retries) {
        const delayMs = calculateBackoff(attempt, backoffBaseMs, maxBackoffMs, jitter)
        console.log(`🔄 fetchWithRetry: Attempt ${attempt + 1}/${retries + 1} failed, retrying in ${delayMs}ms...`)
        onRetry(attempt + 1, lastError)
        await sleep(delayMs)
        continue
      }

      // Out of retries, return error response
      return response

    } catch (error: any) {
      lastError = error

      // Check if error is retryable
      const isRetryable = 
        error.name === 'AbortError' || // Timeout
        error.message.includes('fetch') || // Network error
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT')

      if (!isRetryable) {
        console.error(`❌ fetchWithRetry: Non-retryable error:`, error)
        throw error
      }

      // If we have retries left, wait and retry
      if (attempt < retries) {
        const delayMs = calculateBackoff(attempt, backoffBaseMs, maxBackoffMs, jitter)
        console.log(`🔄 fetchWithRetry: Attempt ${attempt + 1}/${retries + 1} failed (${error.message}), retrying in ${delayMs}ms...`)
        onRetry(attempt + 1, error)
        await sleep(delayMs)
        continue
      }

      // Out of retries, throw error
      console.error(`❌ fetchWithRetry: All ${retries + 1} attempts failed`)
      throw lastError
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError
}

/**
 * Fetch JSON with retry
 */
export async function fetchJsonWithRetry<T = any>(
  url: string,
  options: RequestInit & RetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options)
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }
  
  return response.json()
}

/**
 * Check if error is a network/timeout error that might benefit from retry
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false
  
  const message = error.message?.toLowerCase() || ''
  const name = error.name?.toLowerCase() || ''
  
  return (
    name === 'aborterror' ||
    message.includes('timeout') ||
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('504') ||
    message.includes('502') ||
    message.includes('503')
  )
}
