/**
 * useGridVirtualizer - Chunk visibility and virtualization
 * 
 * Determines which chunks are near the camera and should be loaded/rendered.
 * Uses approximate chunk dimensions for coarse virtualization calculations.
 */

import { useMemo, useCallback } from 'react'
import type { 
  UseGridVirtualizerReturn, 
  ChunkCoordinates, 
  ViewportBounds, 
  ViewportSize 
} from '../types/grid'
import { 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT, 
  VIEWPORT_BUFFER_PX,
  DEBUG_LOGGING 
} from '../utils/constants'

interface UseGridVirtualizerOptions {
  translate: { x: number; y: number }
  viewport: ViewportSize
}

// Distance-based culling constants - increased for better infinite scrolling
const MAX_CHUNK_DISTANCE = 5000 // Maximum distance from viewport center before culling
const SOFT_CHUNK_LIMIT = 32 // Soft limit - start prioritizing closer chunks  
const HARD_CHUNK_LIMIT = 64 // Hard limit - emergency brake for memory protection

export function useGridVirtualizer(options: UseGridVirtualizerOptions): UseGridVirtualizerReturn {
  const { translate, viewport } = options
  
  // ============================================================================
  // VIEWPORT BOUNDS CALCULATION
  // ============================================================================
  
  const getViewportBounds = useCallback((): ViewportBounds => {
    // Convert camera position to world coordinates
    const worldX = -translate.x
    const worldY = -translate.y
    
    // Calculate visible bounds with buffer
    const minX = worldX - VIEWPORT_BUFFER_PX
    const maxX = worldX + viewport.width + VIEWPORT_BUFFER_PX
    const minY = worldY - VIEWPORT_BUFFER_PX
    const maxY = worldY + viewport.height + VIEWPORT_BUFFER_PX
    
    return { minX, maxX, minY, maxY }
  }, [translate, viewport])
  
  // ============================================================================
  // CHUNK VISIBILITY CALCULATION
  // ============================================================================
  
  const calculateVisibleChunks = useCallback((): ChunkCoordinates[] => {
    if (!viewport.width || !viewport.height) return []
    
    const bounds = getViewportBounds()
    const viewportCenterX = -translate.x + viewport.width / 2
    const viewportCenterY = -translate.y + viewport.height / 2
    
    // Calculate chunk coordinate ranges - be more generous for infinite scrolling
    const minChunkX = Math.floor(bounds.minX / CHUNK_WIDTH)
    const maxChunkX = Math.ceil(bounds.maxX / CHUNK_WIDTH)
    const minChunkY = Math.floor(bounds.minY / CHUNK_HEIGHT)
    const maxChunkY = Math.ceil(bounds.maxY / CHUNK_HEIGHT)
    
    // Generate all potential chunk coordinates
    const allChunks: Array<ChunkCoordinates & { distance: number }> = []
    
    for (let x = minChunkX; x <= maxChunkX; x++) {
      for (let y = minChunkY; y <= maxChunkY; y++) {
        // Calculate distance from viewport center
        const chunkCenterX = x * CHUNK_WIDTH + CHUNK_WIDTH / 2
        const chunkCenterY = y * CHUNK_HEIGHT + CHUNK_HEIGHT / 2
        
        const distance = Math.sqrt(
          Math.pow(chunkCenterX - viewportCenterX, 2) + 
          Math.pow(chunkCenterY - viewportCenterY, 2)
        )
        
        // Only include chunks within reasonable distance
        if (distance <= MAX_CHUNK_DISTANCE) {
          allChunks.push({ x, y, distance })
        }
      }
    }
    
    // Sort by distance (closest first)
    allChunks.sort((a, b) => a.distance - b.distance)
    
    // Apply intelligent culling based on chunk count
    let finalChunks = allChunks
    
    if (allChunks.length > SOFT_CHUNK_LIMIT) {
      if (allChunks.length > HARD_CHUNK_LIMIT) {
        // Emergency: Hard limit for memory protection
        finalChunks = allChunks.slice(0, HARD_CHUNK_LIMIT)
        if (DEBUG_LOGGING) {
          console.log(`🚨 Hard limit applied: ${allChunks.length} chunks reduced to ${HARD_CHUNK_LIMIT}`)
        }
      } else {
        // Soft limit: Prioritize chunks closer to viewport
        const viewportDiagonal = Math.sqrt(viewport.width * viewport.width + viewport.height * viewport.height)
        const priorityDistance = viewportDiagonal * 0.8 // 80% of viewport diagonal
        const priorityChunks = allChunks.filter(chunk => chunk.distance <= priorityDistance)
        const remainingSlots = SOFT_CHUNK_LIMIT - priorityChunks.length
        const additionalChunks = allChunks
          .filter(chunk => chunk.distance > priorityDistance)
          .slice(0, Math.max(0, remainingSlots))
        
        finalChunks = [...priorityChunks, ...additionalChunks]
        
        if (DEBUG_LOGGING) {
          console.log(`🎯 Soft limit applied: ${priorityChunks.length} priority + ${additionalChunks.length} additional = ${finalChunks.length} chunks`)
        }
      }
    }
    
    // Convert back to simple chunk coordinates
    const result = finalChunks.map(({ x, y }) => ({ x, y }))
    
    if (DEBUG_LOGGING) {
      console.log(`🎯 Virtualizer: ${result.length} chunks visible (from ${allChunks.length} candidates)`, {
        bounds: { minX: minChunkX, maxX: maxChunkX, minY: minChunkY, maxY: maxChunkY },
        center: { x: Math.round(viewportCenterX), y: Math.round(viewportCenterY) },
        distances: finalChunks.slice(0, 5).map(c => Math.round(c.distance))
      })
    }
    
    return result
  }, [translate, viewport, getViewportBounds])
  
  // ============================================================================
  // MEMOIZED VISIBLE CHUNKS
  // ============================================================================
  
  const visible = useMemo(() => {
    const chunks = calculateVisibleChunks()
    
    if (DEBUG_LOGGING) {
      console.log(`🔍 Virtualizer: ${chunks.length} chunks visible`, {
        viewport: { width: viewport.width, height: viewport.height },
        translate: translate,
        bounds: getViewportBounds(),
        chunks: chunks.map(c => `(${c.x},${c.y})`).slice(0, 5).join(', ') + 
               (chunks.length > 5 ? '...' : '')
      })
    }
    
    return chunks
  }, [calculateVisibleChunks, viewport, translate, getViewportBounds])
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const isInViewport = useCallback((x: number, y: number): boolean => {
    return visible.some(chunk => chunk.x === x && chunk.y === y)
  }, [visible])
  
  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    visible,
    isInViewport,
    getViewportBounds,
  }
}
