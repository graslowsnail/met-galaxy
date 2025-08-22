/**
 * Similarity Grid Renderer
 * 
 * Main rendering orchestrator for the similarity grid system.
 * Handles viewport management, chunk rendering, and visual elements.
 */

import React from 'react'
import { SimilarityChunkManager } from './SimilarityChunkManager'
import type { 
  SimilarityGridState,
  SimilarityImageItem,
  ViewportBounds 
} from './types/similarity'
import { 
  GRID_BACKGROUND_COLOR,
  DEBUG_LOGGING,
  SHOW_CHUNK_BOUNDARIES,
  CHUNK_WIDTH,
  CHUNK_HEIGHT
} from './utils/constants'
import { chunkToWorldCoordinates, getVisibleChunks } from './utils/chunkCalculations'

interface SimilarityGridRendererProps {
  gridState: SimilarityGridState
  viewportBounds: ViewportBounds
  onImageClick: (image: SimilarityImageItem) => void
  showPerformanceOverlay?: boolean
  showLoadingIndicators?: boolean
}

export function SimilarityGridRenderer({
  gridState,
  viewportBounds,
  onImageClick,
  showPerformanceOverlay = false,
  showLoadingIndicators = true
}: SimilarityGridRendererProps) {
  
  // ============================================================================
  // GRID BACKGROUND & AXES
  // ============================================================================
  
  const renderGridBackground = () => {
    if (!DEBUG_LOGGING) return null
    
    const visibleChunkPositions = getVisibleChunks(viewportBounds)
    
    return (
      <>
        {/* Chunk grid lines */}
        {visibleChunkPositions.map(pos => {
          const worldPos = chunkToWorldCoordinates(pos.x, pos.y)
          
          return (
            <div
              key={`grid-${pos.x}-${pos.y}`}
              className="absolute border border-gray-300 border-opacity-30"
              style={{
                left: worldPos.x,
                top: worldPos.y,
                width: CHUNK_WIDTH,
                height: CHUNK_HEIGHT,
                pointerEvents: 'none'
              }}
            >
              {/* Chunk coordinate label */}
              <div className="absolute top-2 left-2 text-xs font-mono text-gray-400 bg-white/80 px-1 rounded">
                ({pos.x}, {pos.y})
              </div>
            </div>
          )
        })}
        
        {/* Center axes */}
        <div
          className="absolute border-l-2 border-red-400 border-opacity-50"
          style={{
            left: 0,
            top: viewportBounds.top,
            height: viewportBounds.bottom - viewportBounds.top,
            pointerEvents: 'none'
          }}
        />
        <div
          className="absolute border-t-2 border-red-400 border-opacity-50"
          style={{
            left: viewportBounds.left,
            top: 0,
            width: viewportBounds.right - viewportBounds.left,
            pointerEvents: 'none'
          }}
        />
        
        {/* Focal point marker */}
        <div
          className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"
          style={{
            left: -8,
            top: -8,
            pointerEvents: 'none'
          }}
        />
      </>
    )
  }
  
  // ============================================================================
  // PERFORMANCE OVERLAY
  // ============================================================================
  
  const renderPerformanceOverlay = () => {
    if (!showPerformanceOverlay) return null
    
    const visibleChunkCount = getVisibleChunks(viewportBounds).length
    const loadedChunkCount = gridState.loadedChunks.size
    const totalImages = Array.from(gridState.loadedChunks.values())
      .reduce((sum, chunkData) => sum + (chunkData.chunk?.images.length || 0), 0)
    
    return (
      <div className="fixed top-4 left-4 bg-black/80 text-white p-4 rounded-lg text-sm font-mono z-50">
        <div className="font-bold mb-2">Similarity Grid Performance</div>
        <div>Focal ID: {gridState.currentFocalId}</div>
        <div>Visible Chunks: {visibleChunkCount}</div>
        <div>Loaded Chunks: {loadedChunkCount}</div>
        <div>Total Images: {totalImages}</div>
        <div>Loading: {gridState.isLoadingSimilarity ? 'Similarity' : ''} {gridState.isLoadingRandom ? 'Random' : ''}</div>
        <div>Transitioning: {gridState.isTransitioning ? 'Yes' : 'No'}</div>
        <div>History Depth: {gridState.navigationHistory.length}</div>
        
        {/* Viewport info */}
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div>Viewport:</div>
          <div>  X: {Math.round(viewportBounds.left)} → {Math.round(viewportBounds.right)}</div>
          <div>  Y: {Math.round(viewportBounds.top)} → {Math.round(viewportBounds.bottom)}</div>
          <div>  Size: {Math.round(viewportBounds.right - viewportBounds.left)} × {Math.round(viewportBounds.bottom - viewportBounds.top)}</div>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // LOADING STATES
  // ============================================================================
  
  const renderLoadingOverlay = () => {
    if (!gridState.isLoadingSimilarity) return null
    
    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-40">
        <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="font-medium">Finding similar artworks...</span>
          </div>
          <div className="text-sm text-gray-600">
            Analyzing image embeddings for artwork ID {gridState.currentFocalId}
          </div>
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // INFO PANEL
  // ============================================================================
  
  const renderInfoPanel = () => {
    if (!gridState.similarityData?.meta) return null
    
    const meta = gridState.similarityData.meta
    
    return (
      <div className="fixed bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg max-w-sm z-30">
        <h3 className="font-medium text-gray-900 mb-1">
          {meta.targetTitle}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          by {meta.targetArtist}
        </p>
        <div className="text-xs text-gray-500 space-y-1">
          <div>Found {meta.count} similar artworks</div>
          <div>Response time: {meta.responseTime}</div>
          {gridState.navigationHistory.length > 0 && (
            <div>Exploration depth: {gridState.navigationHistory.length}</div>
          )}
        </div>
      </div>
    )
  }
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div 
      className="absolute inset-0"
      style={{ backgroundColor: GRID_BACKGROUND_COLOR }}
    >
      {/* Grid background and axes */}
      {renderGridBackground()}
      
      {/* Main chunk manager */}
      <SimilarityChunkManager
        currentFocalId={gridState.currentFocalId}
        viewportBounds={viewportBounds}
        gridState={gridState}
        onImageClick={onImageClick}
        showLoadingIndicators={showLoadingIndicators}
      />
      
      {/* Loading overlay */}
      {renderLoadingOverlay()}
      
      {/* Performance overlay */}
      {renderPerformanceOverlay()}
      
      {/* Info panel */}
      {renderInfoPanel()}
    </div>
  )
}