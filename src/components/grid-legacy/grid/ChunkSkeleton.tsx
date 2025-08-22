/**
 * ChunkSkeleton - Loading placeholder for chunks with image placeholders
 * 
 * This component displays placeholder images in a fixed grid layout while
 * the actual chunk data is being loaded. This ensures users never see a
 * blank screen and provides a natural loading experience.
 */

import React, { memo, useMemo } from 'react'
import type { ChunkSkeletonProps } from './types/grid'
import { 
  GRID_ORIGIN_X, 
  GRID_ORIGIN_Y, 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT,
  Z_INDEX_CHUNK_OUTLINE,
  CHUNK_BORDER_COLOR,
  COLUMNS_PER_CHUNK,
  COLUMN_WIDTH,
  GAP,
  AXIS_MARGIN,
  CHUNK_SIZE
} from './utils/constants'

/**
 * Generate placeholder positions for a chunk
 */
function generatePlaceholderPositions(chunkX: number, chunkY: number) {
  const positions: Array<{ x: number; y: number; height: number; width: number }> = []
  const baseX = GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH)
  const baseY = GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT)
  
  // Fixed heights for placeholder images
  const placeholderHeights = [180, 220, 160, 200, 190, 210, 170, 230, 150]
  const imagesPerColumn = Math.ceil(CHUNK_SIZE / COLUMNS_PER_CHUNK)
  
  let imageIndex = 0
  
  // Simple left-to-right, top-to-bottom layout for placeholders
  const availableHeight = CHUNK_HEIGHT - 2 * AXIS_MARGIN
  
  for (let col = 0; col < COLUMNS_PER_CHUNK; col++) {
    let columnY = AXIS_MARGIN
    let remainingHeight = availableHeight
    
    for (let i = 0; i < imagesPerColumn && imageIndex < CHUNK_SIZE; i++) {
      let height = placeholderHeights[imageIndex % placeholderHeights.length]!
      
      // If this is the last image in the column or we're running out of space,
      // make it fill the remaining height
      const isLastImageInColumn = (i === imagesPerColumn - 1) || (imageIndex === CHUNK_SIZE - 1)
      const isLastColumnWithImages = col === COLUMNS_PER_CHUNK - 1 || 
        (Math.floor(imageIndex / imagesPerColumn) === col && imageIndex + imagesPerColumn >= CHUNK_SIZE)
      
      if (isLastImageInColumn || remainingHeight < height + GAP) {
        // Fill remaining space minus gap
        height = Math.max(remainingHeight - (isLastImageInColumn ? 0 : GAP), 80)
      }
      
      // Simple positioning - same for all chunks
      const localX = AXIS_MARGIN + col * (COLUMN_WIDTH + GAP)
      const localY = columnY
      
      positions.push({
        x: baseX + localX,
        y: baseY + localY,
        height,
        width: COLUMN_WIDTH
      })
      
      columnY += height + GAP
      remainingHeight -= (height + GAP)
      imageIndex++
      
      // Stop if we've filled the column height
      if (remainingHeight <= 0) break
    }
  }
  
  return positions
}

/**
 * Skeleton component with placeholder images
 */
const ChunkSkeleton = memo(function ChunkSkeleton({
  chunkX,
  chunkY,
  showBoundary = false
}: ChunkSkeletonProps & { 
  showBoundary?: boolean
}) {
  const chunkLeft = GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH)
  const chunkTop = GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT)

  // Generate placeholder positions
  const placeholderPositions = useMemo(
    () => generatePlaceholderPositions(chunkX, chunkY),
    [chunkX, chunkY]
  )

  return (
    <>
      {/* Placeholder images */}
      {placeholderPositions.map((pos, index) => (
        <div
          key={`placeholder-${chunkX}-${chunkY}-${index}`}
          className="absolute animate-pulse"
          style={{
            left: pos.x,
            top: pos.y,
            width: pos.width,
            height: pos.height,
            backgroundColor: 'white',
            borderRadius: '4px'
          }}
        />
      ))}
      
      {/* Optional chunk boundary for debugging */}
      {showBoundary && (
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
      )}
    </>
  )
})

ChunkSkeleton.displayName = 'ChunkSkeleton'

export default ChunkSkeleton