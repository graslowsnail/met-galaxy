/**
 * Virtualization hook specific to similarity field with correct chunk dimensions
 * Based on the main useVirtualization hook but uses similarity field constants
 */

import { useCallback, useEffect } from 'react'
import { useChunkCoordinates } from '../../grid-legacy/grid/hooks/useChunkCoordinates'
import type { 
  ChunkCoordinates, 
  ViewportState,
  Chunk 
} from '../../grid-legacy/grid/types/grid'
import { calculateViewportBounds } from '../utils/chunkCalculations'
import { MAX_RENDERED_CHUNKS, CHUNK_WIDTH, CHUNK_HEIGHT, DEBUG_LOGGING } from '../utils/constants'

interface VirtualizationHookParams {
  viewport: ViewportState
  isDragging: boolean
  isInitialized: boolean
  chunks: Map<string, Chunk>
  setChunks: React.Dispatch<React.SetStateAction<Map<string, Chunk>>>
}

interface VirtualizationHookReturn {
  visibleChunks: ChunkCoordinates[]
  chunksToLoad: ChunkCoordinates[]
  updateVirtualization: () => void
}

/**
 * Similarity field specific virtualization hook
 */
export function useVirtualization({
  viewport,
  isInitialized,
  chunks,
  setChunks
}: VirtualizationHookParams): VirtualizationHookReturn {
  
  const enabled = isInitialized && viewport.width > 0 && viewport.height > 0
  const visibleChunks = useChunkCoordinates(
    calculateViewportBounds(viewport, false), CHUNK_WIDTH, CHUNK_HEIGHT, enabled,
  )
  const chunksToLoad = useChunkCoordinates(
    calculateViewportBounds(viewport, true), CHUNK_WIDTH, CHUNK_HEIGHT, enabled,
  )

  /**
   * Aggressive cleanup for true virtualization - immediately drop chunks outside viewport
   */
  const cleanupChunks = useCallback(() => {
    if (chunks.size <= MAX_RENDERED_CHUNKS) return
    
    const visibleKeys = new Set(chunksToLoad.map(coord => `${coord.x},${coord.y}`))
    
    const toRemove: string[] = []
    chunks.forEach((_, key) => {
      if (!visibleKeys.has(key)) {
        toRemove.push(key)
      }
    })
    
    if (toRemove.length > 0) {
      setChunks(prev => {
        const updated = new Map(prev)
        toRemove.forEach(key => updated.delete(key))
        
        if (DEBUG_LOGGING) {
          console.log(`🗑️ Similarity cleanup: removed ${toRemove.length} chunks, ${updated.size} remaining`)
        }
        
        return updated
      })
    }
  }, [chunks, chunksToLoad, setChunks])
  
  const updateVirtualization = useCallback(() => {
    if (enabled) cleanupChunks()
  }, [enabled, cleanupChunks])

  useEffect(() => {
    updateVirtualization()
  }, [updateVirtualization])

  return {
    visibleChunks,
    chunksToLoad,
    updateVirtualization
  }
}