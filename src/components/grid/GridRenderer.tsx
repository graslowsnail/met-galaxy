/**
 * GridRenderer - Handles the main grid rendering including axis lines and chunk orchestration
 * 
 * This component manages the overall grid layout, axis lines, and coordinates the
 * rendering of individual chunks. It provides the foundational structure for the
 * infinite scrollable grid.
 */

import React, { memo } from 'react'
import ChunkComponent from './ChunkComponent'
import ChunkSkeleton from './ChunkSkeleton'
import type { GridRendererProps } from './types/grid'
import { 
  GRID_ORIGIN_X, 
  GRID_ORIGIN_Y,
  AXIS_LINE_COLOR,
  AXIS_LINE_THICKNESS,
  Z_INDEX_AXIS_LINES,
  SHOW_CHUNK_BOUNDARIES,
  DEBUG_LOGGING
} from './utils/constants'

/**
 * Axis lines component - renders the coordinate system lines
 */
const AxisLines = memo(function AxisLines() {
  return (
    <>
      {/* Vertical axis line */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: GRID_ORIGIN_X,
          top: -50000,
          width: AXIS_LINE_THICKNESS,
          height: 100000,
          backgroundColor: AXIS_LINE_COLOR,
          zIndex: Z_INDEX_AXIS_LINES
        }}
      />
      {/* Horizontal axis line */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: -50000,
          top: GRID_ORIGIN_Y,
          width: 100000,
          height: AXIS_LINE_THICKNESS,
          backgroundColor: AXIS_LINE_COLOR,
          zIndex: Z_INDEX_AXIS_LINES
        }}
      />
    </>
  )
})

/**
 * Loading indicators component - shows skeletons for chunks that need loading
 * Shows both chunks that are about to load AND chunks that are actively loading
 */
const LoadingIndicators = memo(function LoadingIndicators({ 
  loadingChunks,
  chunksToLoad,
  existingChunks
}: { 
  loadingChunks: Set<string>
  chunksToLoad: import('./types/grid').ChunkCoordinates[]
  existingChunks: Map<string, import('./types/grid').Chunk>
}) {
  // Create a combined set of all chunks that should show skeletons
  const allLoadingChunks = new Set<string>()
  
  // Add actively loading chunks
  loadingChunks.forEach(key => allLoadingChunks.add(key))
  
  // Add chunks that are identified for loading but don't exist yet
  chunksToLoad.forEach(coord => {
    const chunkKey = `${coord.x},${coord.y}`
    if (!existingChunks.has(chunkKey)) {
      allLoadingChunks.add(chunkKey)
    }
  })

  if (allLoadingChunks.size === 0) return null

  return (
    <>
      {Array.from(allLoadingChunks).map(chunkKey => {
        const [xStr, yStr] = chunkKey.split(',')
        const chunkX = parseInt(xStr!, 10)
        const chunkY = parseInt(yStr!, 10)
        
        return (
          <ChunkSkeleton
            key={`loading-${chunkKey}`}
            chunkX={chunkX}
            chunkY={chunkY}
            showBoundary={SHOW_CHUNK_BOUNDARIES}
          />
        )
      })}
    </>
  )
})

/**
 * Performance overlay component - shows debug information
 */
const PerformanceOverlay = memo(function PerformanceOverlay({
  chunks,
  translate,
  visibleChunks,
  chunkDataMap,
  isVisible = true
}: {
  chunks: Map<string, import('./types/grid').Chunk>
  translate: import('./types/grid').Position
  visibleChunks: number
  chunkDataMap: Map<string, import('./types/grid').ChunkData>
  isVisible?: boolean
}) {
  if (!isVisible) return null

  const totalImages = Array.from(chunks.values()).reduce((total, chunk) => total + chunk.positions.length, 0)
  const loadingChunks = Array.from(chunkDataMap.values()).filter(data => data.loading).length

  return (
    <div
      className="fixed top-4 left-4 z-50 bg-black/75 text-white px-3 py-2 rounded text-xs font-mono space-y-1"
      style={{ transform: `translate(${-translate.x}px, ${-translate.y}px)` }}
    >
      <div className="text-green-400">🎮 VIRTUALIZED</div>
      <div>Rendered: {chunks.size}/12</div>
      <div>Images: {totalImages}</div>
      <div>Data Cache: {chunkDataMap.size}/100</div>
      <div>Loading: {loadingChunks}</div>
      <div>Viewport: {visibleChunks} chunks</div>
      <div>Pos: ({Math.round(-translate.x)}, {Math.round(-translate.y)})</div>
    </div>
  )
})

/**
 * Main grid renderer component
 */
const GridRenderer = memo(function GridRenderer({
  chunks,
  translate,
  isDragging,
  onImageClick,
  loadingChunks = new Set(),
  chunksToLoad = [],
  visibleChunks = 0,
  chunkDataMap = new Map(),
  showPerformanceOverlay = true
}: GridRendererProps & {
  loadingChunks?: Set<string>
  chunksToLoad?: import('./types/grid').ChunkCoordinates[]
  visibleChunks?: number
  chunkDataMap?: Map<string, import('./types/grid').ChunkData>
  showPerformanceOverlay?: boolean
}) {
  
  if (DEBUG_LOGGING) {
    console.log(`🎨 GridRenderer: Rendering ${chunks.size} chunks, dragging: ${isDragging}`)
  }

  return (
    <div className="relative w-full h-full">
      {/* Axis lines for coordinate system */}
      <AxisLines />
      
      {/* Loading indicators for chunks being fetched */}
      <LoadingIndicators 
        loadingChunks={loadingChunks} 
        chunksToLoad={chunksToLoad}
        existingChunks={chunks}
      />
      
      {/* Rendered chunks */}
      {Array.from(chunks.values()).map((chunk) => (
        <ChunkComponent
          key={chunk.id}
          chunk={chunk}
          onImageClick={onImageClick}
          isDragging={isDragging}
          showBoundary={SHOW_CHUNK_BOUNDARIES}
        />
      ))}
      
      {/* Performance debug overlay */}
      {showPerformanceOverlay && (
        <PerformanceOverlay
          chunks={chunks}
          translate={translate}
          visibleChunks={visibleChunks}
          chunkDataMap={chunkDataMap}
        />
      )}
    </div>
  )
})

// Add display names for better debugging
GridRenderer.displayName = 'GridRenderer'
AxisLines.displayName = 'AxisLines'
LoadingIndicators.displayName = 'LoadingIndicators'
PerformanceOverlay.displayName = 'PerformanceOverlay'

export default GridRenderer
