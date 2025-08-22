/**
 * Similarity Chunk Manager
 * 
 * Manages the lifecycle of similarity chunks, including data fetching,
 * chunk creation, and rendering coordination. Similar to the main grid's
 * ChunkManager but optimized for similarity exploration.
 */

import React, { useMemo } from 'react'
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
    similarityData: gridState.similarityData,
    randomArtworks: gridState.randomArtworks
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
  
  const virtualizationResult = useVirtualization({
    viewport: viewportState,
    isDragging: false,
    isInitialized: true,
    chunks: chunks,
    setChunks: () => {} // Not used for similarity grid
  })
  
  const visibleChunks = virtualizationResult.visibleChunks.map(coord => 
    chunks.get(`${coord.x},${coord.y}`)
  ).filter(Boolean)
  
  if (DEBUG_LOGGING) {
    console.log(`📊 SimilarityChunkManager: ${visibleChunks.length} visible chunks, ${chunks.size} total chunks`)
  }
  
  // ============================================================================
  // CHUNK RENDERING
  // ============================================================================
  
  return (
    <>
      {visibleChunks.map((chunk) => {
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