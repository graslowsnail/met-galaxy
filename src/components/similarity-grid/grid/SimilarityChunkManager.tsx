/**
 * Similarity Chunk Manager
 * 
 * Manages the lifecycle of similarity chunks, including data fetching,
 * chunk creation, and rendering coordination. Similar to the main grid's
 * ChunkManager but optimized for similarity exploration.
 */

import React, { useMemo, useEffect, useCallback } from 'react'
import { SimilarityChunkComponent } from './SimilarityChunkComponent'
import { useSimilarityChunkData } from './hooks/useSimilarityChunkData'
import { useVirtualization } from '../../grid-legacy/grid/hooks/useVirtualization'
import type { 
  SimilarityChunk, 
  SimilarityGridState,
  ViewportBounds 
} from './types/similarity'
import { DEBUG_LOGGING } from './utils/constants'

interface SimilarityChunkManagerProps {
  currentFocalId: number
  viewportBounds: ViewportBounds
  gridState: SimilarityGridState
  onImageClick: (image: any) => void
  showLoadingIndicators?: boolean
}

export function SimilarityChunkManager({
  currentFocalId,
  viewportBounds,
  gridState,
  onImageClick,
  showLoadingIndicators = true
}: SimilarityChunkManagerProps) {
  
  // ============================================================================
  // DATA MANAGEMENT
  // ============================================================================
  
  const {
    chunks,
    loadingChunks,
    errorChunks,
    loadChunk,
    clearCache
  } = useSimilarityChunkData({
    currentFocalId,
    similarityData: gridState.similarityData
  })
  
  // ============================================================================
  // VIRTUALIZATION
  // ============================================================================
  
  // Convert viewport bounds to format expected by useVirtualization
  const viewportState = useMemo(() => ({
    translateX: -viewportBounds.left, // Negative values for viewport system
    translateY: -viewportBounds.top,  // Negative values for viewport system
    width: viewportBounds.right - viewportBounds.left,
    height: viewportBounds.bottom - viewportBounds.top
  }), [viewportBounds])
  
  // Convert SimilarityChunk to Chunk for virtualization compatibility
  const convertedChunks = useMemo(() => {
    const converted = new Map()
    for (const [chunkId, similarityChunk] of chunks.entries()) {
      // Create a basic conversion - positions and bounds will be calculated by the renderer
      converted.set(chunkId, {
        id: similarityChunk.id,
        x: similarityChunk.x,
        y: similarityChunk.y,
        images: similarityChunk.images,
        positions: [], // Will be calculated by masonry layout in renderer
        bounds: { left: 0, top: 0, right: 0, bottom: 0 }, // Will be calculated
        actualHeight: 1600 // Default chunk height
      })
    }
    return converted
  }, [chunks])

  const virtualizationResult = useVirtualization({
    viewport: viewportState,
    isDragging: false,
    isInitialized: true,
    chunks: convertedChunks,
    setChunks: () => {} // Not used for similarity grid
  })
  
  // ============================================================================
  // ON-DEMAND CHUNK LOADING
  // ============================================================================
  
  /**
   * Load chunks that are visible but not yet loaded
   * Only load focal chunk if similarity data is available
   */
  const loadVisibleChunks = useCallback(async () => {
    const chunksToLoad = virtualizationResult.chunksToLoad
    
    for (const coord of chunksToLoad) {
      const chunkId = `${gridState.currentFocalId}:${coord.x},${coord.y}`
      
      // Skip if chunk is already loaded or loading
      if (chunks.has(chunkId) || loadingChunks.has(chunkId)) {
        continue
      }
      
      // For focal chunk (0,0), only load if similarity data is available
      if (coord.x === 0 && coord.y === 0 && !gridState.similarityData) {
        if (DEBUG_LOGGING) {
          console.log(`⏸️ Skipping focal chunk ${chunkId} - similarity data not ready`)
        }
        continue
      }
      
      // For Ring 1 chunks (similarity chunks), only load if similarity data is available
      const ring = Math.max(Math.abs(coord.x), Math.abs(coord.y))
      if (ring === 1 && !gridState.similarityData) {
        if (DEBUG_LOGGING) {
          console.log(`⏸️ Skipping Ring 1 chunk ${chunkId} - similarity data not ready`)
        }
        continue
      }
      
      try {
        loadChunk(chunkId) // Don't await - load in parallel for better performance
      } catch (error) {
        console.warn(`Failed to load chunk ${chunkId}:`, error)
      }
    }
  }, [virtualizationResult.chunksToLoad, chunks, loadingChunks, loadChunk, gridState.similarityData])
  
  /**
   * Trigger chunk loading when viewport changes
   */
  useEffect(() => {
    loadVisibleChunks()
  }, [loadVisibleChunks])
  
  /**
   * Load Ring 1 chunks immediately when similarity data becomes available
   */
  useEffect(() => {
    if (gridState.similarityData) {
      console.log(`✅ Similarity data available - loading Ring 1 chunks immediately`)
      
      // Load focal chunk first
      const focalChunkId = `${gridState.currentFocalId}:0,0`
      if (!chunks.has(focalChunkId) && !loadingChunks.has(focalChunkId)) {
        loadChunk(focalChunkId)
      }
      
      // Load Ring 1 chunks immediately
      const ring1Positions = [
        { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
        { x: -1, y: 0 },  /* FOCAL */     { x: 1, y: 0 },
        { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 }
      ]
      
      for (const pos of ring1Positions) {
        const chunkId = `${gridState.currentFocalId}:${pos.x},${pos.y}`
        if (!chunks.has(chunkId) && !loadingChunks.has(chunkId)) {
          loadChunk(chunkId)
        }
      }
    }
  }, [gridState.similarityData, chunks, loadingChunks, loadChunk])
  
  // Combine virtualization-detected chunks with essential similarity chunks
  const visibleChunks = useMemo(() => {
    const virtualizedChunks = virtualizationResult.visibleChunks.map(coord => 
      chunks.get(`${gridState.currentFocalId}:${coord.x},${coord.y}`)
    ).filter(Boolean)
    
    // Always include focal chunk and Ring 1 chunks when similarity data is available
    if (gridState.similarityData) {
      const essentialChunkIds = [
        `${gridState.currentFocalId}:0,0`, // Focal
        `${gridState.currentFocalId}:-1,-1`, `${gridState.currentFocalId}:0,-1`, `${gridState.currentFocalId}:1,-1`,
        `${gridState.currentFocalId}:-1,0`, `${gridState.currentFocalId}:1,0`,
        `${gridState.currentFocalId}:-1,1`, `${gridState.currentFocalId}:0,1`, `${gridState.currentFocalId}:1,1`  // Ring 1
      ]
      
      for (const chunkId of essentialChunkIds) {
        const chunk = chunks.get(chunkId)
        if (chunk && !virtualizedChunks.some(c => c?.id === chunkId)) {
          virtualizedChunks.push(chunk)
        }
      }
    }
    
    return virtualizedChunks
  }, [virtualizationResult.visibleChunks, chunks, gridState.similarityData, gridState.currentFocalId])
  
  if (DEBUG_LOGGING) {
    console.log(`📊 Rendering ${visibleChunks.length} chunks (${chunks.size} total loaded, similarity data: ${!!gridState.similarityData})`)
  }
  
  // ============================================================================
  // CHUNK RENDERING
  // ============================================================================
  
  return (
    <>
      {visibleChunks.filter((chunk): chunk is NonNullable<typeof chunk> => chunk != null).map((chunk) => {
        const isLoading = loadingChunks.has(chunk.id)
        const error = errorChunks.get(chunk.id)
        
        return (
          <SimilarityChunkComponent
            key={chunk.id}
            chunk={chunk}
            isLoading={isLoading}
            error={error}
            onImageClick={onImageClick}
            showLoadingIndicators={showLoadingIndicators}
          />
        )
      })}
      
      {/* Debug info */}
      {DEBUG_LOGGING && (
        <div 
          className="fixed top-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-50"
        >
          <div>Focal ID: {currentFocalId}</div>
          <div>Visible Chunks: {visibleChunks.length}</div>
          <div>Total Chunks: {chunks.size}</div>
          <div>Loading: {loadingChunks.size}</div>
          <div>Errors: {errorChunks.size}</div>
        </div>
      )}
    </>
  )
}