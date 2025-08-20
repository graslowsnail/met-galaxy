/**
 * DraggableImageGridV2 - Column Carry-Over Implementation
 * 
 * Complete replacement using the infinite-plane masonry approach.
 * Eliminates horizontal gaps by treating the world as a continuous plane
 * with column heights that carry over between chunks per strip.
 */

"use client"

import React, { useEffect, useCallback, useMemo } from 'react'
import type { DraggableImageGridV2Props, ImageItem, PositionedImage } from './grid-v2/types/grid'

// Import all the new hooks
import { usePointerPan } from './grid-v2/hooks/usePointerPan'
import { useViewportSize } from './grid-v2/hooks/useViewportSize'
import { useGridVirtualizer } from './grid-v2/hooks/useGridVirtualizer'
import { useChunkLoader } from './grid-v2/hooks/useChunkLoader'
import { useColumnCarryover } from './grid-v2/hooks/useColumnCarryover'

// Import constants
import { 
  WORLD_BACKGROUND_COLOR,
  CLICK_MOVE_THRESHOLD,
  IMAGE_BORDER_RADIUS,
  IMAGE_SHADOW,
  DEBUG_LOGGING,
  SHOW_PERFORMANCE_OVERLAY,
  SHOW_LOADING_INDICATORS,
  DEFAULT_ARIA_LABEL
} from './grid-v2/utils/constants'

// ============================================================================
// WORLD PLANE COMPONENT
// ============================================================================

interface WorldPlaneProps {
  tiles: PositionedImage[]
  translate: { x: number; y: number }
  onTileClick?: (image: ImageItem, event: React.MouseEvent) => void
  isDragging: boolean
  dragDistance: number
}

const WorldPlane = React.memo(function WorldPlane({ 
  tiles, 
  translate, 
  onTileClick, 
  isDragging,
  dragDistance 
}: WorldPlaneProps) {
  const handleTileClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    // Prevent clicks during drag or if movement was significant
    if (isDragging || dragDistance > CLICK_MOVE_THRESHOLD) {
      if (DEBUG_LOGGING) {
        console.log('🚫 Click prevented:', { isDragging, dragDistance })
      }
      return
    }
    
    event.stopPropagation()
    onTileClick?.(image, event)
  }, [isDragging, dragDistance, onTileClick])
  
  if (DEBUG_LOGGING) {
    console.log(`🎨 WorldPlane: Rendering ${tiles.length} tiles`)
  }
  
  return (
    <div
      className="absolute inset-0"
      style={{
        transform: `translate(${translate.x}px, ${translate.y}px)`,
        willChange: isDragging ? 'transform' : 'auto',
      }}
    >
      {tiles.map((tile) => (
        <button
          key={tile.image.id}
          className="absolute overflow-hidden transition-shadow duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          style={{
            left: tile.worldX,
            top: tile.worldY,
            width: tile.width,
            height: tile.height,
            borderRadius: IMAGE_BORDER_RADIUS,
            boxShadow: IMAGE_SHADOW.default,
          }}
          onClick={(e) => handleTileClick(tile.image, e)}
          aria-label={tile.image.title ? `${tile.image.title} by ${tile.image.artist || 'Unknown'}` : DEFAULT_ARIA_LABEL}
        >
          <img
            src={tile.image.src}
            alt={tile.image.title || ''}
            className="w-full h-full object-cover"
            style={{ borderRadius: IMAGE_BORDER_RADIUS }}
            loading="lazy"
            draggable={false}
          />
        </button>
      ))}
    </div>
  )
})

// ============================================================================
// PERFORMANCE OVERLAY COMPONENT
// ============================================================================

interface PerformanceOverlayProps {
  visible: boolean
  stats: {
    visibleChunks: number
    totalTiles: number
    cacheSize: number
    cacheHits: number
    cacheMisses: number
    strips: number
    position: { x: number; y: number }
  }
  translate: { x: number; y: number }
}

const PerformanceOverlay = React.memo(function PerformanceOverlay({ 
  visible, 
  stats, 
  translate 
}: PerformanceOverlayProps) {
  if (!visible) return null
  
  const hitRate = stats.cacheHits + stats.cacheMisses > 0 
    ? ((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100).toFixed(1)
    : '0.0'
  
  return (
    <div
      className="fixed top-4 left-4 z-50 bg-black/75 text-white px-3 py-2 rounded text-xs font-mono space-y-1"
      style={{ transform: `translate(${-translate.x}px, ${-translate.y}px)` }}
    >
      <div className="text-green-400">🚀 COLUMN CARRY-OVER</div>
      <div>Chunks: {stats.visibleChunks}</div>
      <div>Tiles: {stats.totalTiles}</div>
      <div>Strips: {stats.strips}</div>
      <div>Cache: {stats.cacheSize}/100</div>
      <div>Hit Rate: {hitRate}%</div>
      <div>Pos: ({Math.round(stats.position.x)}, {Math.round(stats.position.y)})</div>
    </div>
  )
})

// ============================================================================
// LOADING INDICATORS COMPONENT
// ============================================================================

interface LoadingIndicatorsProps {
  visible: boolean
  loadingChunks: Array<{ x: number; y: number }>
}

const LoadingIndicators = React.memo(function LoadingIndicators({ 
  visible, 
  loadingChunks 
}: LoadingIndicatorsProps) {
  if (!visible || loadingChunks.length === 0) return null
  
  return (
    <>
      {loadingChunks.map((chunk) => (
        <div
          key={`loading-${chunk.x}-${chunk.y}`}
          className="absolute bg-gray-200/50 border border-gray-300 rounded flex items-center justify-center"
          style={{
            left: chunk.x * 1200, // Approximate chunk width
            top: chunk.y * 1600,  // Approximate chunk height
            width: 1200,
            height: 1600,
          }}
        >
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      ))}
    </>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DraggableImageGridV2({
  onArtworkClick,
  initialTranslate = { x: 0, y: 0 },
  showPerformanceOverlay = SHOW_PERFORMANCE_OVERLAY,
  showLoadingIndicators = SHOW_LOADING_INDICATORS
}: DraggableImageGridV2Props) {
  
  // ============================================================================
  // HOOKS INITIALIZATION
  // ============================================================================
  
  const { containerRef, size, isInitialized } = useViewportSize()
  
  const { 
    translate, 
    isDragging, 
    dragDistance,
    onPointerDown 
  } = usePointerPan({ 
    initialTranslate,
    onDragStart: () => {
      if (DEBUG_LOGGING) console.log('🎯 Drag started')
    },
    onDragEnd: () => {
      if (DEBUG_LOGGING) console.log('🎯 Drag ended')
    }
  })
  
  const { visible } = useGridVirtualizer({ translate, viewport: size })
  
  const { loadChunk, getCacheStats } = useChunkLoader()
  
  const { upsertChunk, snapshotPlaced, getStats, pruneTo } = useColumnCarryover()
  
  // ============================================================================
  // CHUNK LOADING AND PLACEMENT
  // ============================================================================
  
  useEffect(() => {
    if (!isInitialized || visible.length === 0) return
    
    // Load all visible chunks
    const loadPromises = visible.map(async (coord) => {
      try {
        const chunkData = await loadChunk(coord.x, coord.y)
        if (chunkData && chunkData.images.length > 0) {
          // Place chunk in the column carry-over system
          upsertChunk(coord.x, coord.y, chunkData.images)
          
          if (DEBUG_LOGGING) {
            console.log(`✅ Placed chunk (${coord.x}, ${coord.y}) with ${chunkData.images.length} images`)
          }
        }
      } catch (error) {
        console.error(`❌ Failed to load/place chunk (${coord.x}, ${coord.y}):`, error)
      }
    })
    
    // Wait for all chunks to load
    Promise.all(loadPromises).catch((error) => {
      console.error('❌ Error loading chunks:', error)
    })
  }, [visible, isInitialized, loadChunk, upsertChunk])
  
  // ============================================================================
  // MEMORY MANAGEMENT
  // ============================================================================
  
  useEffect(() => {
    if (visible.length === 0) return
    
    // Create set of visible chunk keys for pruning
    const visibleKeys = new Set(visible.map(coord => `${coord.x}:${coord.y}`))
    
    // Prune non-visible chunks from column carry-over system
    pruneTo(visibleKeys)
  }, [visible, pruneTo])
  
  // ============================================================================
  // RENDER DATA PREPARATION
  // ============================================================================
  
  const tiles = useMemo(() => {
    return snapshotPlaced()
  }, [snapshotPlaced, visible]) // Re-snapshot when visible chunks change
  
  const performanceStats = useMemo(() => {
    const carryoverStats = getStats()
    const cacheStats = getCacheStats()
    
    return {
      visibleChunks: visible.length,
      totalTiles: carryoverStats.totalTiles,
      cacheSize: cacheStats.size,
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses,
      strips: carryoverStats.strips,
      position: { x: -translate.x, y: -translate.y }
    }
  }, [visible.length, getStats, getCacheStats, translate])
  
  const loadingChunks = useMemo(() => {
    // For now, show loading for chunks we're trying to load
    // In a more sophisticated implementation, you'd track loading state
    return []
  }, [])
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleTileClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    if (DEBUG_LOGGING) {
      console.log('🖼️ Tile clicked:', {
        id: image.id,
        title: image.title,
        artist: image.artist,
        databaseId: image.databaseId
      })
    }
    
    onArtworkClick?.(image)
  }, [onArtworkClick])
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (DEBUG_LOGGING) {
    console.log('🎛️ DraggableImageGridV2 render:', {
      isInitialized,
      visibleChunks: visible.length,
      totalTiles: tiles.length,
      isDragging,
      translate
    })
  }
  
  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ backgroundColor: WORLD_BACKGROUND_COLOR }}
      onPointerDown={onPointerDown}
    >
      {/* World Plane with positioned tiles */}
      <WorldPlane
        tiles={tiles}
        translate={translate}
        onTileClick={handleTileClick}
        isDragging={isDragging}
        dragDistance={dragDistance}
      />
      
      {/* Loading indicators */}
      <LoadingIndicators
        visible={showLoadingIndicators}
        loadingChunks={loadingChunks}
      />
      
      {/* Performance overlay */}
      <PerformanceOverlay
        visible={showPerformanceOverlay}
        stats={performanceStats}
        translate={translate}
      />
    </div>
  )
}
