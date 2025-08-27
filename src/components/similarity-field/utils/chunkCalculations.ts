/**
 * Chunk calculation utilities specific to the similarity field
 * These use the similarity field constants for compact grid layout
 */

import type { 
  PositionedImage, 
  ChunkCoordinates, 
  Position, 
  ViewportBounds,
  ViewportState 
} from '../../grid-legacy/grid/types/grid'
import {
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  AXIS_MARGIN,
  GAP,
  GRID_ORIGIN_X,
  GRID_ORIGIN_Y,
  VIEWPORT_BUFFER,
} from './constants'

// ============================================================================
// COORDINATE SYSTEM FUNCTIONS (Similarity Field Specific)
// ============================================================================

/**
 * Convert pixel coordinates to chunk coordinates using similarity field dimensions
 */
export function pixelToChunkCoords(pixelX: number, pixelY: number): ChunkCoordinates {
  const chunkX = Math.floor((pixelX - GRID_ORIGIN_X) / CHUNK_WIDTH)
  const chunkY = Math.floor((pixelY - GRID_ORIGIN_Y) / CHUNK_HEIGHT)
  return { x: chunkX, y: chunkY }
}

/**
 * Convert chunk coordinates to pixel coordinates using similarity field dimensions
 */
export function chunkToPixelCoords(chunkX: number, chunkY: number): Position {
  const result = {
    x: GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH),
    y: GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT),
  }
  
  // console.log(`📍 Similarity chunkToPixelCoords(${chunkX},${chunkY}): Using CHUNK_WIDTH=${CHUNK_WIDTH}, CHUNK_HEIGHT=${CHUNK_HEIGHT} → (${result.x},${result.y})`)
  
  return result
}

/**
 * Calculate viewport bounds for visibility calculations using similarity field dimensions
 */
export function calculateViewportBounds(viewport: ViewportState, includeBuffer = true): ViewportBounds {
  const buffer = includeBuffer ? VIEWPORT_BUFFER : 0
  
  return {
    left: -viewport.translateX - buffer,
    right: -viewport.translateX + viewport.width + buffer,
    top: -viewport.translateY - buffer,
    bottom: -viewport.translateY + viewport.height + buffer,
  }
}

/**
 * Get visible chunk coordinates within viewport bounds using similarity field dimensions
 */
export function getVisibleChunkCoords(bounds: ViewportBounds): ChunkCoordinates[] {
  const startChunkX = Math.floor((bounds.left - GRID_ORIGIN_X) / CHUNK_WIDTH)
  const endChunkX = Math.ceil((bounds.right - GRID_ORIGIN_X) / CHUNK_WIDTH)
  const startChunkY = Math.floor((bounds.top - GRID_ORIGIN_Y) / CHUNK_HEIGHT)
  const endChunkY = Math.ceil((bounds.bottom - GRID_ORIGIN_Y) / CHUNK_HEIGHT)
  
  const coords: ChunkCoordinates[] = []
  for (let x = startChunkX; x <= endChunkX; x++) {
    for (let y = startChunkY; y <= endChunkY; y++) {
      coords.push({ x, y })
    }
  }
  
  // Debug logging to verify we're using correct dimensions
  // if (coords.length > 0) {
  //   console.log(`🔍 Similarity getVisibleChunkCoords: Using CHUNK_WIDTH=${CHUNK_WIDTH}, CHUNK_HEIGHT=${CHUNK_HEIGHT}`)
  //   console.log(`   Bounds: left=${bounds.left}, right=${bounds.right}, top=${bounds.top}, bottom=${bounds.bottom}`)
  //   console.log(`   Chunk range: X(${startChunkX}-${endChunkX}), Y(${startChunkY}-${endChunkY})`)
  //   console.log(`   Found ${coords.length} chunks:`, coords.map(c => `(${c.x},${c.y})`).join(', '))
  // }
  
  return coords
}

// ============================================================================
// GRID LAYOUT FUNCTIONS
// ============================================================================

/**
 * Calculate simple grid layout for similarity field (2x3 grid)
 * This creates a fixed grid layout without masonry for the similarity field
 * @deprecated Use calculateSimilarityMasonryLayout from masonryLayout.ts instead
 */
export function calculateSimpleGridLayout(
  images: { width: number; height: number }[],
  chunkX: number,
  chunkY: number,
  columnsPerChunk = 2,
  rowsPerChunk = 3
): PositionedImage[] {
  const positions: PositionedImage[] = []
  const maxImages = Math.min(images.length, columnsPerChunk * rowsPerChunk)
  
  // Calculate base chunk position
  const baseX = GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH)
  const baseY = GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT)
  
  // Calculate cell dimensions
  const cellWidth = (CHUNK_WIDTH - (2 * AXIS_MARGIN) - ((columnsPerChunk - 1) * GAP)) / columnsPerChunk
  const cellHeight = (CHUNK_HEIGHT - (2 * AXIS_MARGIN) - ((rowsPerChunk - 1) * GAP)) / rowsPerChunk
  
  for (let i = 0; i < maxImages; i++) {
    const row = Math.floor(i / columnsPerChunk)
    const col = i % columnsPerChunk
    
    // Calculate position within the chunk (relative to chunk origin)
    const localX = AXIS_MARGIN + col * (cellWidth + GAP)
    const localY = AXIS_MARGIN + row * (cellHeight + GAP)
    
    // Return positions relative to chunk, not absolute world positions
    const x = localX
    const y = localY
    
    // Use the cell height as image height for uniform grid appearance
    const height = cellHeight
    
    positions[i] = {
      x,
      y,
      height
    }
  }
  
  return positions
}