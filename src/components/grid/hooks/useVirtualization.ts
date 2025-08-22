/**
 * Hook for managing chunk virtualization and visibility calculations
 * 
 * This hook encapsulates all logic for determining which chunks should be visible,
 * when to load new chunks, and when to cleanup distant chunks for optimal performance.
 * It works closely with the viewport hook to provide efficient chunk management.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { 
  ChunkCoordinates, 
  ViewportBounds, 
  ViewportState,
  UseVirtualizationReturn,
  Chunk
} from '../types/grid'
import { 
  getVisibleChunkCoords,
  calculateViewportBounds,
  getChunkKey,
  isSignificantViewportChange
} from '../utils/chunkCalculations'
import { 
  MAX_RENDERED_CHUNKS,
  VIEWPORT_CHANGE_THRESHOLD,
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
 * - RAF-throttled updates for smooth performance
 * - Drag-aware updates to prevent stuttering
 * - Configurable virtualization thresholds
 */
export function useVirtualization(options: UseVirtualizationOptions): UseVirtualizationReturn {
  const { viewport, isDragging, isInitialized, chunks, setChunks } = options
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  /** Currently visible chunk coordinates */
  const [visibleChunks, setVisibleChunks] = useState<ChunkCoordinates[]>([])
  
  /** Chunk coordinates that should be loaded (including buffer) */
  const [chunksToLoad, setChunksToLoad] = useState<ChunkCoordinates[]>([])
  
  // ============================================================================
  // REFS FOR PERFORMANCE
  // ============================================================================
  
  /** Track last viewport state for change detection */
  const lastViewport = useRef({ x: 0, y: 0, width: 0, height: 0 })
  
  /** RAF ID for throttled updates */
  const rafId = useRef<number | undefined>(undefined)
  
  /** Cleanup callbacks for external systems */
  const cleanupCallbacks = useRef<Array<() => void>>([])
  
  // ============================================================================
  // VISIBILITY CALCULATIONS
  // ============================================================================
  
  /**
   * Calculate visible chunk coordinates based on current viewport
   */
  const calculateVisibleChunks = useCallback((includeBuffer = true): ChunkCoordinates[] => {
    const bounds = calculateViewportBounds(viewport, includeBuffer)
    return getVisibleChunkCoords(bounds)
  }, [viewport])
  
  /**
   * Calculate chunks that are strictly within viewport (no buffer)
   */
  const calculateStrictVisibleChunks = useCallback((): ChunkCoordinates[] => {
    const bounds = calculateViewportBounds(viewport, false)
    return getVisibleChunkCoords(bounds)
  }, [viewport])
  
  /**
   * Update visible chunks and chunks to load
   */
  const updateChunkVisibility = useCallback(() => {
    const bufferedVisible = calculateVisibleChunks(true)
    const strictVisible = calculateStrictVisibleChunks()
    
    setVisibleChunks(strictVisible)
    setChunksToLoad(bufferedVisible)
    
    if (DEBUG_LOGGING) {
      console.log(`🔍 Visibility update: ${strictVisible.length} visible, ${bufferedVisible.length} to load`)
    }
  }, [calculateVisibleChunks, calculateStrictVisibleChunks])
  
  // ============================================================================
  // CHUNK MANAGEMENT
  // ============================================================================
  
  /**
   * Aggressive cleanup for true virtualization - immediately drop chunks outside viewport
   */
  const cleanupDistantChunks = useCallback(() => {
    const visibleCoords = calculateVisibleChunks(true)
    const visibleSet = new Set(visibleCoords.map(coord => getChunkKey(coord.x, coord.y)))
    
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
      
      return newChunks
    })
    
    // Trigger external cleanup callbacks
    cleanupCallbacks.current.forEach(callback => callback())
  }, [calculateVisibleChunks, setChunks])
  
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
  
  // ============================================================================
  // VIRTUALIZATION UPDATE LOGIC
  // ============================================================================
  
  /**
   * Main virtualization update function
   */
  const updateVirtualization = useCallback(() => {
    // Don't update chunks until we're properly initialized
    if (!viewport.width || !viewport.height || !isInitialized) {
      if (DEBUG_LOGGING) {
        console.log('⏭️ Skipping virtualization: not initialized')
      }
      return
    }
    
    // CRITICAL: Don't update virtualization while user is dragging to prevent stuttering
    if (isDragging) {
      if (DEBUG_LOGGING) {
        console.log('⏭️ Skipping virtualization: dragging active')
      }
      return
    }
    
    const currentViewport = {
      x: -viewport.translateX,
      y: -viewport.translateY,
      width: viewport.width,
      height: viewport.height
    }
    
    // Use larger threshold to prevent frequent updates during smooth scrolling
    // BUT: Allow initial render by checking if we have never updated before
    const isInitialRender = lastViewport.current.x === 0 && lastViewport.current.y === 0
    const hasSignificantChange = isSignificantViewportChange(
      { x: lastViewport.current.x, y: lastViewport.current.y },
      { x: currentViewport.x, y: currentViewport.y },
      VIEWPORT_CHANGE_THRESHOLD
    )
    
    if (!hasSignificantChange && !isInitialRender) {
      return
    }
    
    lastViewport.current = currentViewport
    
    if (DEBUG_LOGGING) {
      console.log('🎯 Viewport changed, updating virtualization')
    }
    
    // Update visibility calculations
    updateChunkVisibility()
    
    // Always cleanup first for immediate virtualization
    cleanupDistantChunks()
  }, [viewport, isInitialized, isDragging, updateChunkVisibility, cleanupDistantChunks])
  
  /**
   * Force immediate virtualization update (useful for external triggers)
   */
  const forceUpdate = useCallback(() => {
    updateChunkVisibility()
    cleanupDistantChunks()
  }, [updateChunkVisibility, cleanupDistantChunks])
  
  // ============================================================================
  // RAF-THROTTLED UPDATES
  // ============================================================================
  
  /**
   * Only trigger virtualization updates when viewport significantly changes
   */
  useEffect(() => {
    // Don't auto-update - let external systems trigger updates when needed
    // This prevents infinite loops from constant RAF scheduling
    if (!isInitialized || isDragging) {
      return
    }

    // Only update if viewport has changed significantly to prevent excessive calls
    const currentViewport = { 
      x: viewport.translateX, 
      y: viewport.translateY, 
      width: viewport.width, 
      height: viewport.height 
    }
    
    if (!isSignificantViewportChange(lastViewport.current, currentViewport, VIEWPORT_CHANGE_THRESHOLD)) {
      return
    }

    // Throttle updates to prevent excessive calls
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }
    
    rafId.current = requestAnimationFrame(() => {
      updateVirtualization()
      lastViewport.current = currentViewport
    })
    
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [isInitialized, viewport.translateX, viewport.translateY, viewport.width, viewport.height, isDragging, updateVirtualization])
  
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
      isActive: !isDragging && isInitialized
    }
  }, [visibleChunks.length, chunksToLoad.length, chunks.size, needsChunkCleanup, isDragging, isInitialized])
  
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
