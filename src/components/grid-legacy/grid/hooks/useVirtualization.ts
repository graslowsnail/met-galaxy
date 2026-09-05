/**
 * Hook for managing chunk virtualization and visibility calculations
 * 
 * This hook encapsulates all logic for determining which chunks should be visible,
 * when to load new chunks, and when to cleanup distant chunks for optimal performance.
 * It works closely with the viewport hook to provide efficient chunk management.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useChunkCoordinates } from './useChunkCoordinates'
import type { 
  ViewportBounds, 
  ViewportState,
  UseVirtualizationReturn,
  Chunk
} from '../types/grid'
import { 
  calculateViewportBounds,
  getChunkKey
} from '../utils/chunkCalculations'
import { 
  MAX_RENDERED_CHUNKS,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  DEBUG_LOGGING 
} from '../utils/constants'

interface UseVirtualizationOptions {
  /** Current viewport state */
  viewport: ViewportState
  /** Whether dragging is currently active */
  isDragging: boolean
  /** Whether viewport is initialized */
  isInitialized: boolean
  /** Current chunks map */
  chunks: Map<string, Chunk>
  /** Function to set chunks */
  setChunks: (chunks: Map<string, Chunk> | ((prev: Map<string, Chunk>) => Map<string, Chunk>)) => void
}

/**
 * Custom hook for chunk virtualization with performance optimization
 * 
 * Features:
 * - Efficient visibility calculations
 * - Aggressive chunk cleanup for memory management
 * - Viewport coverage during dragging and momentum
 * - Stable coordinate lists between chunk crossings
 */
export function useVirtualization(options: UseVirtualizationOptions): UseVirtualizationReturn {
  const { viewport, isInitialized, chunks, setChunks } = options

  const enabled = isInitialized && viewport.width > 0 && viewport.height > 0
  const visibleChunks = useChunkCoordinates(
    calculateViewportBounds(viewport, false), CHUNK_WIDTH, CHUNK_HEIGHT, enabled,
  )
  const chunksToLoad = useChunkCoordinates(
    calculateViewportBounds(viewport, true), CHUNK_WIDTH, CHUNK_HEIGHT, enabled,
  )
  const cleanupCallbacks = useRef<Array<() => void>>([])

  /**
   * Aggressive cleanup for true virtualization - immediately drop chunks outside viewport
   */
  const cleanupDistantChunks = useCallback(() => {
    const visibleSet = new Set(chunksToLoad.map(coord => getChunkKey(coord.x, coord.y)))
    
    setChunks(prevChunks => {
      const newChunks = new Map(prevChunks)
      let removedCount = 0
      
      // Immediately remove ALL chunks that are not in viewport (aggressive virtualization)
      for (const [chunkKey] of newChunks) {
        if (!visibleSet.has(chunkKey)) {
          newChunks.delete(chunkKey)
          removedCount++
        }
      }
      
      if (removedCount > 0 && DEBUG_LOGGING) {
        console.log(`🧹 Virtualization cleanup: removed ${removedCount} chunks, keeping ${newChunks.size}`)
      }
      
      return removedCount > 0 ? newChunks : prevChunks
    })
    
    // Trigger external cleanup callbacks
    cleanupCallbacks.current.forEach(callback => callback())
  }, [chunksToLoad, setChunks])
  
  /**
   * Check if chunk limit is exceeded and needs cleanup
   */
  const needsChunkCleanup = useCallback((): boolean => {
    return chunks.size > MAX_RENDERED_CHUNKS
  }, [chunks.size])
  
  /**
   * Get chunks that should be removed based on distance from viewport
   */
  const getChunksToRemove = useCallback((maxToKeep: number): string[] => {
    if (chunks.size <= maxToKeep) return []
    
    const viewportCenter = {
      x: -viewport.translateX + viewport.width / 2,
      y: -viewport.translateY + viewport.height / 2
    }
    
    // Calculate distance for each chunk and sort by distance
    const chunkDistances = Array.from(chunks.entries()).map(([key, chunk]) => {
      const chunkCenterX = chunk.bounds.minX + (chunk.bounds.maxX - chunk.bounds.minX) / 2
      const chunkCenterY = chunk.bounds.minY + (chunk.bounds.maxY - chunk.bounds.minY) / 2
      
      const distance = Math.sqrt(
        Math.pow(chunkCenterX - viewportCenter.x, 2) +
        Math.pow(chunkCenterY - viewportCenter.y, 2)
      )
      
      return { key, distance }
    })
    
    // Sort by distance (farthest first) and return keys to remove
    chunkDistances.sort((a, b) => b.distance - a.distance)
    const excessCount = chunks.size - maxToKeep
    return chunkDistances.slice(0, excessCount).map(item => item.key)
  }, [chunks, viewport])
  
  const updateVirtualization = useCallback(() => {
    if (enabled) cleanupDistantChunks()
  }, [enabled, cleanupDistantChunks])

  const forceUpdate = updateVirtualization

  useEffect(() => {
    updateVirtualization()
  }, [updateVirtualization, chunks.size])

  // ============================================================================
  // EXTERNAL INTEGRATION
  // ============================================================================
  
  /**
   * Register cleanup callback for external systems
   */
  const onCleanup = useCallback((callback: () => void) => {
    cleanupCallbacks.current.push(callback)
    
    // Return cleanup function
    return () => {
      const index = cleanupCallbacks.current.indexOf(callback)
      if (index > -1) {
        cleanupCallbacks.current.splice(index, 1)
      }
    }
  }, [])
  
  /**
   * Get virtualization statistics for monitoring
   */
  const getVirtualizationStats = useCallback(() => {
    return {
      visibleChunks: visibleChunks.length,
      chunksToLoad: chunksToLoad.length,
      renderedChunks: chunks.size,
      maxRenderedChunks: MAX_RENDERED_CHUNKS,
      needsCleanup: needsChunkCleanup(),
      isActive: isInitialized
    }
  }, [visibleChunks.length, chunksToLoad.length, chunks.size, needsChunkCleanup, isInitialized])
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  /**
   * Check if a specific chunk is currently visible
   */
  const isChunkVisible = useCallback((chunkX: number, chunkY: number): boolean => {
    return visibleChunks.some(coord => coord.x === chunkX && coord.y === chunkY)
  }, [visibleChunks])
  
  /**
   * Check if a specific chunk should be loaded
   */
  const shouldLoadChunk = useCallback((chunkX: number, chunkY: number): boolean => {
    return chunksToLoad.some(coord => coord.x === chunkX && coord.y === chunkY)
  }, [chunksToLoad])
  
  /**
   * Get the viewport bounds for external use
   */
  const getViewportBounds = useCallback((includeBuffer = true): ViewportBounds => {
    return calculateViewportBounds(viewport, includeBuffer)
  }, [viewport])
  
  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    // Core visibility data
    visibleChunks,
    chunksToLoad,
    
    // Update functions
    updateVirtualization,
    forceUpdate,
    cleanup: cleanupDistantChunks,
    
    // Utility functions
    isChunkVisible,
    shouldLoadChunk,
    getViewportBounds,
    getVirtualizationStats,
    onCleanup,
    
    // Cleanup management
    needsChunkCleanup,
    getChunksToRemove,
  }
}
