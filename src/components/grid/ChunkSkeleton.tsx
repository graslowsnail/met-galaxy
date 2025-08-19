/**
 * ChunkSkeleton - Minimal loading placeholder for chunks while data is being fetched
 * 
 * This component provides a simple loading boundary for chunks that are being loaded.
 * Since loading works fine without visual skeleton items, this just provides
 * an optional boundary outline for debugging purposes.
 */

import React, { memo } from 'react'
import type { ChunkSkeletonProps } from './types/grid'
import { 
  GRID_ORIGIN_X, 
  GRID_ORIGIN_Y, 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT,
  Z_INDEX_CHUNK_OUTLINE,
  CHUNK_BORDER_COLOR
} from './utils/constants'

/**
 * Minimal skeleton component - just shows chunk boundary for debugging
 */
const ChunkSkeleton = memo(function ChunkSkeleton({
  chunkX,
  chunkY,
  showBoundary = false
}: ChunkSkeletonProps & { 
  showBoundary?: boolean
}) {
  // Early return if not showing boundary - no point rendering empty container
  if (!showBoundary) {
    return null
  }

  const chunkLeft = GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH)
  const chunkTop = GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT)

  return (
    <div
      className="absolute pointer-events-none border border-dashed opacity-50"
      style={{
        left: chunkLeft,
        top: chunkTop,
        width: CHUNK_WIDTH,
        height: CHUNK_HEIGHT,
        borderColor: CHUNK_BORDER_COLOR,
        zIndex: Z_INDEX_CHUNK_OUTLINE
      }}
    />
  )
})

ChunkSkeleton.displayName = 'ChunkSkeleton'

export default ChunkSkeleton