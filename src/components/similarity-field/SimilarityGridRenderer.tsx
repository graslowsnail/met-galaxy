/**
 * SimilarityGridRenderer - Custom grid renderer for similarity field
 * 
 * This is based on the main GridRenderer but uses FocalChunkComponent
 * for focal chunks (coordinates 0,0) and regular ChunkComponent for others.
 */

import { memo } from 'react'
import SimilarityChunkComponent from './SimilarityChunkComponent'
import ChunkSkeleton from '../grid-legacy/grid/ChunkSkeleton'
import FocalChunkComponent from './FocalChunkComponent'
import type { GridRendererProps } from '../grid-legacy/grid/types/grid'
import { 
  GRID_ORIGIN_X, 
  GRID_ORIGIN_Y,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
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
  chunksToLoad,
  existingChunks
}: { 
  chunksToLoad: import('../grid-legacy/grid/types/grid').ChunkCoordinates[]
  existingChunks: Map<string, import('../grid-legacy/grid/types/grid').Chunk>
}) {
  const allLoadingChunks = new Set(
    chunksToLoad
      .filter(coord => !existingChunks.has(`${coord.x},${coord.y}`))
      .map(coord => `${coord.x},${coord.y}`)
  )

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
            chunkWidth={CHUNK_WIDTH}
            chunkHeight={CHUNK_HEIGHT}
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
  dragDistance,
  onImageClick,
  chunksToLoad = [],
  visibleChunks = 0,
  chunkDataMap = new Map(),
  focalArtwork
}: GridRendererProps & {
  dragDistance?: number
  loadingChunks?: Set<string>
  chunksToLoad?: import('../grid-legacy/grid/types/grid').ChunkCoordinates[]
  visibleChunks?: number
  chunkDataMap?: Map<string, import('../grid-legacy/grid/types/grid').ChunkData>
  focalArtwork?: {
    id: number
    objectId?: number | null
    title: string | null
    artist: string | null
    date?: string | null
    medium?: string | null
    creditLine?: string | null
    accessionNumber?: string | null
    department?: string | null
    description?: string | null
    classification?: string | null
    culture?: string | null
    period?: string | null
    dynasty?: string | null
    objectUrl?: string | null
  }
}) {
  

  return (
    <div className="relative w-full h-full">
      {/* Axis lines for coordinate system */}
      <AxisLines />
      
      {/* Loading indicators for chunks being fetched */}
      <LoadingIndicators 
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
              dragDistance={dragDistance ?? 0}
              focalArtwork={focalArtwork}
            />
          )
        } else {
          return (
            <SimilarityChunkComponent
              key={chunk.id}
              chunk={chunk}
              onImageClick={onImageClick}
              isDragging={isDragging}
              dragDistance={dragDistance ?? 0}
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
