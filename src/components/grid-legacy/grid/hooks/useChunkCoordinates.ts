import { useMemo } from 'react'
import type { ChunkCoordinates, ViewportBounds } from '../types/grid'

export function useChunkCoordinates(
  bounds: ViewportBounds,
  chunkWidth: number,
  chunkHeight: number,
  enabled: boolean,
): ChunkCoordinates[] {
  const minX = Math.floor(bounds.left / chunkWidth)
  const maxX = Math.ceil(bounds.right / chunkWidth) - 1
  const minY = Math.floor(bounds.top / chunkHeight)
  const maxY = Math.ceil(bounds.bottom / chunkHeight) - 1

  // Keep the list stable between chunk crossings while tracking every rendered viewport.
  return useMemo(() => {
    if (!enabled) return []

    const coordinates: ChunkCoordinates[] = []
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        coordinates.push({ x, y })
      }
    }
    return coordinates
  }, [minX, maxX, minY, maxY, enabled])
}
