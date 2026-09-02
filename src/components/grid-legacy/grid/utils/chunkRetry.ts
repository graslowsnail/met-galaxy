/**
 * Chunk retry helper
 *
 * Tracks retry attempts per chunk key and schedules a backed-off retry.
 * Both the main grid and similarity loaders use it so a failed or empty
 * chunk fetch does not strand the chunk for the rest of the session.
 */

import { useCallback, useEffect, useRef } from 'react'

/** Maximum number of automatic retries per chunk */
export const MAX_CHUNK_RETRIES = 4

/** Base delay for the first retry; each attempt doubles it */
const BASE_RETRY_DELAY_MS = 500

export interface ChunkRetry {
  /** Whether the chunk still has retry attempts left */
  canRetry: (key: string) => boolean
  /** Schedule a backed-off retry; returns false when attempts are exhausted */
  scheduleRetry: (key: string, run: () => void) => boolean
  /** Forget a chunk after it loads so a later failure retries fresh */
  clearRetry: (key: string) => void
  /** Cancel every pending retry and reset all attempt counters */
  resetAll: () => void
}

export function useChunkRetry(): ChunkRetry {
  const attempts = useRef<Map<string, number>>(new Map())
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const canRetry = useCallback((key: string) => {
    return (attempts.current.get(key) ?? 0) < MAX_CHUNK_RETRIES
  }, [])

  const scheduleRetry = useCallback((key: string, run: () => void) => {
    if (timeouts.current.has(key)) return true
    const attempt = attempts.current.get(key) ?? 0
    if (attempt >= MAX_CHUNK_RETRIES) return false

    attempts.current.set(key, attempt + 1)
    const delay = BASE_RETRY_DELAY_MS * 2 ** attempt
    const timeout = setTimeout(() => {
      timeouts.current.delete(key)
      run()
    }, delay)
    timeouts.current.set(key, timeout)
    return true
  }, [])

  const clearRetry = useCallback((key: string) => {
    const timeout = timeouts.current.get(key)
    if (timeout) clearTimeout(timeout)
    timeouts.current.delete(key)
    attempts.current.delete(key)
  }, [])

  const resetAll = useCallback(() => {
    timeouts.current.forEach(timeout => clearTimeout(timeout))
    timeouts.current.clear()
    attempts.current.clear()
  }, [])

  // Cancel pending retries when the owning component unmounts
  useEffect(() => resetAll, [resetAll])

  return { canRetry, scheduleRetry, clearRetry, resetAll }
}
