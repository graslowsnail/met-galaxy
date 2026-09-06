'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { isChunkLoadError } from '@/lib/chunk-error'

// A React render error escapes as a dead page unless a boundary catches it. The
// known cause here is a stale tab across a deploy failing to load the similarity
// explorer's async chunk (see components/similarity-field/SimilarityField.tsx).
// A full reload is the reliable recovery for that case, so a chunk miss reloads
// and every other error retries the segment.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (posthog.__loaded) posthog.captureException(error)
  }, [error])

  const isChunkError = isChunkLoadError(error)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        width: '100vw',
        height: '100vh',
        padding: '1.5rem',
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        color: '#3c3931',
      }}
    >
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', margin: 0 }}>
        Something went wrong
      </h1>
      <p style={{ maxWidth: '28rem', margin: 0, opacity: 0.8 }}>
        {isChunkError
          ? 'A new version of the site is available. Reload to keep exploring.'
          : 'The explorer hit an unexpected error. Try again to continue.'}
      </p>
      <button
        type="button"
        onClick={() => (isChunkError ? window.location.reload() : reset())}
        style={{
          cursor: 'pointer',
          borderRadius: '9999px',
          border: 'none',
          backgroundColor: '#3c3931',
          color: '#f5f5f5',
          padding: '0.6rem 1.4rem',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        {isChunkError ? 'Reload' : 'Try again'}
      </button>
    </div>
  )
}
