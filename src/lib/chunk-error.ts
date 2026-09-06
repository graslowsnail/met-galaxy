// A tab left open across a deploy asks for a chunk hash the new deployment no
// longer serves, so webpack's async import rejects with ChunkLoadError. Both the
// retry at the import site and the error boundary key off this predicate.
export function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ChunkLoadError' || /Loading chunk \d+ failed/.test(error.message))
  )
}
