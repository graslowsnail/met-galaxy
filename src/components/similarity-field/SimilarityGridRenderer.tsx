/**
 * SimilarityGridRenderer - Custom grid renderer for similarity field
 * 
 * This is based on the main GridRenderer but uses FocalChunkComponent
 * for focal chunks (coordinates 0,0) and regular ChunkComponent for others.
 */

import React, { memo } from 'react'
import SimilarityChunkComponent from './SimilarityChunkComponent'
import SimilarityChunkSkeleton from './SimilarityChunkSkeleton'
import FocalChunkComponent from './FocalChunkComponent'
import type { GridRendererProps } from '../grid-legacy/grid/types/grid'
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
 */
const LoadingIndicators = memo(function LoadingIndicators({ 
  loadingChunks,
  chunksToLoad,
  existingChunks
}: { 
  loadingChunks: Set<string>
  chunksToLoad: import('../grid-legacy/grid/types/grid').ChunkCoordinates[]
  existingChunks: Map<string, import('../grid-legacy/grid/types/grid').Chunk>
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
          <SimilarityChunkSkeleton
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
 * Main similarity grid renderer component
 */
const SimilarityGridRenderer = memo(function SimilarityGridRenderer({
  chunks,
  translate,
  isDragging,
  onImageClick,
  loadingChunks = new Set(),
  chunksToLoad = [],
  visibleChunks = 0,
  chunkDataMap = new Map()
}: GridRendererProps & {
  loadingChunks?: Set<string>
  chunksToLoad?: import('../grid-legacy/grid/types/grid').ChunkCoordinates[]
  visibleChunks?: number
  chunkDataMap?: Map<string, import('../grid-legacy/grid/types/grid').ChunkData>
}) {
  
  if (DEBUG_LOGGING) {
    console.log(`🎯 SimilarityGridRenderer: Rendering ${chunks.size} chunks, dragging: ${isDragging}`)
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
      
      {/* Rendered chunks - use FocalChunkComponent for focal chunks */}
      {Array.from(chunks.values()).map((chunk) => {
        const isFocalChunk = chunk.x === 0 && chunk.y === 0
        
        if (isFocalChunk) {
          return (
            <FocalChunkComponent
              key={chunk.id}
              chunk={chunk}
              onImageClick={onImageClick}
              isDragging={isDragging}
            />
          )
        } else {
          return (
            <SimilarityChunkComponent
              key={chunk.id}
              chunk={chunk}
              onImageClick={onImageClick}
              isDragging={isDragging}
              showBoundary={SHOW_CHUNK_BOUNDARIES}
            />
          )
        }
      })}
    </div>
  )
})

SimilarityGridRenderer.displayName = 'SimilarityGridRenderer'

export default SimilarityGridRenderer