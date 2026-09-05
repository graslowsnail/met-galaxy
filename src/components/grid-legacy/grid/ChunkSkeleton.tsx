import { memo, useMemo } from 'react'
import {
  GRID_ORIGIN_X, GRID_ORIGIN_Y, CHUNK_WIDTH, CHUNK_HEIGHT,
  COLUMNS_PER_CHUNK, COLUMN_WIDTH, GAP, AXIS_MARGIN,
  Z_INDEX_CHUNK_OUTLINE, CHUNK_BORDER_COLOR,
} from './utils/constants'

const ChunkSkeleton = memo(function ChunkSkeleton({
  chunkX,
  chunkY,
  showBoundary = false,
  chunkWidth = CHUNK_WIDTH,
  chunkHeight = CHUNK_HEIGHT,
}: {
  chunkX: number
  chunkY: number
  showBoundary?: boolean
  chunkWidth?: number
  chunkHeight?: number
}) {
  const scaleX = chunkWidth / CHUNK_WIDTH
  const scaleY = chunkHeight / CHUNK_HEIGHT
  const positions = useMemo(() => {
    const height = CHUNK_HEIGHT
    const columns = COLUMNS_PER_CHUNK
    const columnWidth = COLUMN_WIDTH
    const gap = GAP
    const padding = AXIS_MARGIN
    const availableHeight = height - 2 * padding
    const rows = Math.max(1, Math.round((availableHeight + gap) / (columnWidth * 1.15 + gap)))
    const tileSpace = availableHeight - (rows - 1) * gap
    const weights = [1, 1.25, 0.85, 1.1, 0.95]
    const tiles: Array<{ x: number; y: number; height: number }> = []

    for (let column = 0; column < columns; column++) {
      const offset = ((chunkX * 3 + chunkY * 7 + column * 2) % weights.length + weights.length) % weights.length
      const columnWeights = Array.from({ length: rows }, (_, row) => weights[(offset + row) % weights.length]!)
      const totalWeight = columnWeights.reduce((sum, weight) => sum + weight, 0)
      let y = padding

      for (const weight of columnWeights) {
        const tileHeight = tileSpace * weight / totalWeight
        tiles.push({ x: padding + column * (columnWidth + gap), y, height: tileHeight })
        y += tileHeight + gap
      }
    }
    return tiles
  }, [chunkX, chunkY])

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
