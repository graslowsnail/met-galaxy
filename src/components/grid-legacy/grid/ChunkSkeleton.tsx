import { memo, useMemo } from 'react'
import {
  GRID_ORIGIN_X, GRID_ORIGIN_Y, CHUNK_WIDTH, CHUNK_HEIGHT,
  CHUNK_SIZE, COLUMN_WIDTH,
  Z_INDEX_CHUNK_OUTLINE, CHUNK_BORDER_COLOR,
} from './utils/constants'
import { calculateImageDimensions, calculateOptimalChunkLayout, generateAspectRatio, DEFAULT_CHUNK_LAYOUT, type ChunkLayout } from './utils/chunkCalculations'

const ChunkSkeleton = memo(function ChunkSkeleton({
  chunkX,
  chunkY,
  showBoundary = false,
  chunkWidth = CHUNK_WIDTH,
  chunkHeight = CHUNK_HEIGHT,
  layout = DEFAULT_CHUNK_LAYOUT,
  imageCount = CHUNK_SIZE,
}: {
  chunkX: number
  chunkY: number
  showBoundary?: boolean
  chunkWidth?: number
  chunkHeight?: number
  layout?: ChunkLayout
  imageCount?: number
}) {
  const scaleX = chunkWidth / layout.width
  const scaleY = chunkHeight / layout.height
  const positions = useMemo(() => {
    const images = Array.from({ length: imageCount }, (_, index) => (
      calculateImageDimensions(generateAspectRatio(chunkX, chunkY, index))
    ))
    return calculateOptimalChunkLayout(images, chunkX, chunkY, layout).map(position => ({
      ...position,
      x: position.x - (GRID_ORIGIN_X + chunkX * layout.width),
      y: position.y - (GRID_ORIGIN_Y + chunkY * layout.height),
    }))
  }, [chunkX, chunkY, layout, imageCount])

  return (
    <div
      aria-hidden="true"
      data-skeleton-chunk={`${chunkX},${chunkY}`}
      className="pointer-events-none absolute"
      style={{
        left: GRID_ORIGIN_X + chunkX * chunkWidth,
        top: GRID_ORIGIN_Y + chunkY * chunkHeight,
        width: chunkWidth,
        height: chunkHeight,
      }}
    >
      {positions.map((position, index) => (
        <div
          key={index}
          className="gallery-skeleton absolute rounded"
          style={{ left: position.x * scaleX, top: position.y * scaleY, width: COLUMN_WIDTH * scaleX, height: position.height * scaleY }}
        />
      ))}
      {showBoundary && (
        <div
          className="absolute inset-0 border border-dashed opacity-50"
          style={{ borderColor: CHUNK_BORDER_COLOR, zIndex: Z_INDEX_CHUNK_OUTLINE }}
        />
      )}
    </div>
  )
})

export default ChunkSkeleton
