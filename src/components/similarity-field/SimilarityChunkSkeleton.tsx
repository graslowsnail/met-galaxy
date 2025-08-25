/**
 * Similarity field specific chunk skeleton
 * Based on ChunkSkeleton but uses similarity field constants for correct positioning
 */

import React, { memo } from 'react'
import { 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT, 
  GRID_ORIGIN_X, 
  GRID_ORIGIN_Y,
  COLUMNS_PER_CHUNK,
  ROWS_PER_CHUNK,
  COLUMN_WIDTH,
  GAP,
  AXIS_MARGIN,
  CHUNK_SIZE
} from './utils/constants'
import { CHUNK_BORDER_COLOR } from '../grid-legacy/grid/utils/constants'

interface SimilarityChunkSkeletonProps {
  chunkX: number
  chunkY: number
  showBoundary?: boolean
}

const SimilarityChunkSkeleton = memo(function SimilarityChunkSkeleton({
  chunkX,
  chunkY,
  showBoundary = true
}: SimilarityChunkSkeletonProps) {
  // Calculate positions for skeleton items based on dynamic grid size
  const skeletonItems = []
  const cellWidth = (CHUNK_WIDTH - (2 * AXIS_MARGIN) - ((COLUMNS_PER_CHUNK - 1) * GAP)) / COLUMNS_PER_CHUNK
  const cellHeight = (CHUNK_HEIGHT - (2 * AXIS_MARGIN) - ((ROWS_PER_CHUNK - 1) * GAP)) / ROWS_PER_CHUNK

  for (let i = 0; i < CHUNK_SIZE; i++) {
    const row = Math.floor(i / COLUMNS_PER_CHUNK)
    const col = i % COLUMNS_PER_CHUNK
    
    const localX = AXIS_MARGIN + col * (cellWidth + GAP)
    const localY = AXIS_MARGIN + row * (cellHeight + GAP)
    
    const absoluteX = GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH) + localX
    const absoluteY = GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT) + localY

    skeletonItems.push({
      x: absoluteX,
      y: absoluteY,
      width: cellWidth,
      height: cellHeight
    })
  }

  return (
    <>
      {/* Chunk boundary */}
      {showBoundary && (
        <div
          className="absolute pointer-events-none border-dashed opacity-30"
          style={{
            left: GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH),
            top: GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT),
            width: CHUNK_WIDTH,
            height: CHUNK_HEIGHT,
            borderColor: CHUNK_BORDER_COLOR,
            borderWidth: 1,
            zIndex: 0,
          }}
        />
      )}

      {/* Skeleton items */}
      {skeletonItems.map((item, index) => (
        <div
          key={`skeleton-${chunkX}-${chunkY}-${index}`}
          className="absolute bg-gray-200 animate-pulse rounded"
          style={{
            left: item.x,
            top: item.y,
            width: item.width,
            height: item.height,
            zIndex: 1,
          }}
        />
      ))}
    </>
  )
})

export default SimilarityChunkSkeleton