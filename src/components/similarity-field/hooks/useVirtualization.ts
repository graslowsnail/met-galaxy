/**
 * Virtualization hook specific to similarity field with correct chunk dimensions
 * Based on the main useVirtualization hook but uses similarity field constants
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { 
  ChunkCoordinates, 
  ViewportState,
  ViewportBounds,
  Chunk 
} from '../../grid-legacy/grid/types/grid'
import { calculateViewportBounds, getVisibleChunkCoords } from '../utils/chunkCalculations'
import { MAX_RENDERED_CHUNKS, VIEWPORT_BUFFER, DEBUG_LOGGING } from '../utils/constants'

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
  isDragging,
  isInitialized,
  chunks,
  setChunks
}: VirtualizationHookParams): VirtualizationHookReturn {
  
  // ============================================================================
  // STATE
  // ============================================================================
  
  /** Chunk coordinates currently visible (strictly within viewport) */
  const [visibleChunks, setVisibleChunks] = useState<ChunkCoordinates[]>([])
  
  /** Chunk coordinates that should be loaded (including buffer) */
  const [chunksToLoad, setChunksToLoad] = useState<ChunkCoordinates[]>([])
  
  // ============================================================================
  // REFS FOR PERFORMANCE
  // ============================================================================
  
  /** Track last viewport state for change detection */
  const lastViewport = useRef({ translateX: 0, translateY: 0, width: 0, height: 0 })
  
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
      console.log(`🔍 Similarity virtualization update: ${strictVisible.length} visible, ${bufferedVisible.length} to load`)
      console.log('   Visible chunks:', strictVisible.map(c => `(${c.x},${c.y})`).join(', '))
      console.log('   Chunks to load:', bufferedVisible.map(c => `(${c.x},${c.y})`).join(', '))
    }
  }, [calculateVisibleChunks, calculateStrictVisibleChunks])
  
  // ============================================================================
  // CHUNK MANAGEMENT
  // ============================================================================
  
  /**
   * Aggressive cleanup for true virtualization - immediately drop chunks outside viewport
   */
  const cleanupChunks = useCallback(() => {
    if (chunks.size <= MAX_RENDERED_CHUNKS) return
    
    const visibleBounds = calculateViewportBounds(viewport, true)
    const visibleCoords = getVisibleChunkCoords(visibleBounds)
    const visibleKeys = new Set(visibleCoords.map(coord => `${coord.x},${coord.y}`))
    
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
  }, [chunks, viewport, setChunks])
  
  // ============================================================================
  // MAIN UPDATE FUNCTION
  // ============================================================================
  
  /**
   * Update virtualization state
   */
  const updateVirtualization = useCallback(() => {
    if (!isInitialized) return
    
    // Check if viewport changed significantly
    const current = lastViewport.current
    const hasChanged = (
      Math.abs(viewport.translateX - current.translateX) > 50 ||
      Math.abs(viewport.translateY - current.translateY) > 50 ||
      viewport.width !== current.width ||
      viewport.height !== current.height
    )
    
    if (!hasChanged) return
    
    // Update last viewport
    lastViewport.current = {
      translateX: viewport.translateX,
      translateY: viewport.translateY,
      width: viewport.width,
      height: viewport.height
    }
    
    // Update visibility
    updateChunkVisibility()
    
    // Cleanup if needed
    if (chunks.size > MAX_RENDERED_CHUNKS) {
      cleanupChunks()
    }
    
    if (DEBUG_LOGGING) {
      console.log(`📊 Similarity virtualization: ${chunks.size} chunks, viewport: ${viewport.translateX},${viewport.translateY}`)
    }
  }, [isInitialized, viewport, updateChunkVisibility, cleanupChunks, chunks.size])
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  /**
   * Update virtualization when viewport changes (with debouncing during drag)
   */
  useEffect(() => {
    if (isDragging) return // Skip updates during dragging for performance
    
    const timeoutId = setTimeout(updateVirtualization, 50)
    return () => clearTimeout(timeoutId)
  }, [viewport.translateX, viewport.translateY, viewport.width, viewport.height, isDragging, updateVirtualization])
  
  /**
   * Update immediately when dragging stops
   */
  useEffect(() => {
    if (!isDragging) {
      updateVirtualization()
    }
  }, [isDragging, updateVirtualization])
  
  return {
    visibleChunks,
    chunksToLoad,
    updateVirtualization
  }
}