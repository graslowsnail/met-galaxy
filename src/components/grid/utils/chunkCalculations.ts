/**
 * Pure utility functions for chunk calculations and grid operations
 * 
 * This file contains all the mathematical and layout calculation functions
 * used by the grid system. All functions are pure (no side effects) and
 * can be easily tested and reasoned about.
 */

import type { 
  ChunkCoordinates, 
  ViewportBounds, 
  ViewportState, 
  Position,
  PositionedImage,
  BoundingBox,
  ImageItem
} from "../types/grid"

import {
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  GRID_ORIGIN_X,
  GRID_ORIGIN_Y,
  VIEWPORT_BUFFER,
  AXIS_MARGIN,
  COLUMN_WIDTH,
  GAP,
  COLUMNS_PER_CHUNK,
  MIN_IMAGE_HEIGHT,
  DEFAULT_ASPECT_RATIOS,
} from "./constants"

// ============================================================================
// COORDINATE SYSTEM FUNCTIONS
// ============================================================================

/**
 * Convert pixel coordinates to chunk grid coordinates
 */
export function pixelToChunkCoords(pixelX: number, pixelY: number): ChunkCoordinates {
  const chunkX = Math.floor((pixelX - GRID_ORIGIN_X) / CHUNK_WIDTH)
  const chunkY = Math.floor((pixelY - GRID_ORIGIN_Y) / CHUNK_HEIGHT)
  return { x: chunkX, y: chunkY }
}

/**
 * Convert chunk grid coordinates to pixel coordinates (top-left corner)
 */
export function chunkToPixelCoords(chunkX: number, chunkY: number): Position {
  return {
    x: GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH),
    y: GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT),
  }
}

/**
 * Generate a unique string key for chunk coordinates
 */
export function getChunkKey(chunkX: number, chunkY: number): string {
  return `${chunkX},${chunkY}`
}

/**
 * Parse chunk coordinates from a chunk key string
 */
export function parseChunkKey(chunkKey: string): ChunkCoordinates {
  const [x, y] = chunkKey.split(',').map(Number)
  return { x: x!, y: y! }
}

// ============================================================================
// VIEWPORT CALCULATIONS
// ============================================================================

/**
 * Calculate viewport bounds in pixel coordinates
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
 * Get visible chunk coordinates based on viewport bounds
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
  
  return coords
}

/**
 * Check if a viewport change is significant enough to trigger updates
 */
export function isSignificantViewportChange(
  previous: Position,
  current: Position,
  threshold: number
): boolean {
  return (
    Math.abs(current.x - previous.x) >= threshold ||
    Math.abs(current.y - previous.y) >= threshold
  )
}

// ============================================================================
// CHUNK LAYOUT CALCULATIONS
// ============================================================================

/**
 * Initialize column heights for a new chunk's masonry layout
 */
export function initializeColumnHeights(): number[] {
  return new Array(COLUMNS_PER_CHUNK).fill(AXIS_MARGIN) as number[]
}

/**
 * Calculate the position for an image within a chunk using masonry layout
 */
export function calculateImagePosition(
  columnHeights: number[],
  imageWidth: number,
  imageHeight: number,
  chunkX: number,
  chunkY: number
): { position: PositionedImage; columnIndex: number } | null {
  const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
  const baseX = GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH)
  const baseY = GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT)
  
  // Calculate local position within chunk based on chunk orientation
  let localX: number, localY: number
  
  if (chunkX < 0) {
    // For negative X chunks, position from right edge
    localX = CHUNK_WIDTH - AXIS_MARGIN - (shortestColumnIndex + 1) * (COLUMN_WIDTH + GAP)
    localY = columnHeights[shortestColumnIndex]!
  } else {
    // For positive X chunks, position from left edge  
    localX = AXIS_MARGIN + shortestColumnIndex * (COLUMN_WIDTH + GAP)
    localY = columnHeights[shortestColumnIndex]!
  }
  
  // Final absolute position
  const x = baseX + localX
  const y = baseY + localY
  
  // Check bounds and available space
  const chunkMaxY = baseY + CHUNK_HEIGHT - AXIS_MARGIN
  const chunkMaxX = baseX + CHUNK_WIDTH - AXIS_MARGIN
  const availableHeight = chunkMaxY - y
  const availableWidth = chunkMaxX - x
  
  // Skip if insufficient space
  if (availableHeight < MIN_IMAGE_HEIGHT || availableWidth < COLUMN_WIDTH) {
    return null
  }
  
  // Constrain height to fit within chunk
  const constrainedHeight = Math.min(imageHeight, availableHeight)
  
  // Validate height
  if (!constrainedHeight || constrainedHeight <= 0 || !isFinite(constrainedHeight) || isNaN(constrainedHeight)) {
    return null
  }
  
  return {
    position: { x, y, height: constrainedHeight },
    columnIndex: shortestColumnIndex,
  }
}

/**
 * Update column heights after placing an image
 */
export function updateColumnHeight(
  columnHeights: number[],
  columnIndex: number,
  imageHeight: number
): number[] {
  const newHeights = [...columnHeights]
  newHeights[columnIndex] = newHeights[columnIndex]! + imageHeight + GAP
  return newHeights
}

/**
 * Calculate bounding box for a set of positioned images
 */
export function calculateBoundingBox(
  positions: PositionedImage[],
  imageWidth: number = COLUMN_WIDTH
): BoundingBox {
  if (positions.length === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
    }
  }
  
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  
  positions.forEach(position => {
    minX = Math.min(minX, position.x)
    maxX = Math.max(maxX, position.x + imageWidth)
    minY = Math.min(minY, position.y)
    maxY = Math.max(maxY, position.y + position.height)
  })
  
  return { minX, maxX, minY, maxY }
}

// ============================================================================
// IMAGE GENERATION UTILITIES
// ============================================================================

/**
 * Generate a deterministic aspect ratio based on position
 */
export function generateAspectRatio(chunkX: number, chunkY: number, imageIndex: number): number {
  const seed = Math.abs(chunkX * 1000 + chunkY * 100 + imageIndex)
  return DEFAULT_ASPECT_RATIOS[seed % DEFAULT_ASPECT_RATIOS.length]!
}

/**
 * Calculate image dimensions from aspect ratio
 */
export function calculateImageDimensions(
  aspectRatio: number,
  width: number = COLUMN_WIDTH
): { width: number; height: number } {
  const height = Math.max(MIN_IMAGE_HEIGHT, Math.round(width / aspectRatio))
  return { width, height }
}

/**
 * Generate a unique image ID
 */
export function generateImageId(
  type: 'artwork' | 'placeholder',
  chunkX: number,
  chunkY: number,
  index: number,
  objectId?: number
): string {
  const prefix = type === 'artwork' && objectId ? 'artwork' : 'placeholder'
  return `${prefix}-${chunkX}-${chunkY}-${index}`
}

// ============================================================================
// DISTANCE AND PROXIMITY CALCULATIONS
// ============================================================================

/**
 * Calculate Manhattan distance between two chunk coordinates
 */
export function calculateChunkDistance(
  chunk1: ChunkCoordinates,
  chunk2: ChunkCoordinates
): number {
  return Math.abs(chunk1.x - chunk2.x) + Math.abs(chunk1.y - chunk2.y)
}

/**
 * Check if a chunk is within a certain distance of the viewport center
 */
export function isChunkNearViewport(
  chunkCoords: ChunkCoordinates,
  viewportCenter: Position,
  maxDistance: number
): boolean {
  const chunkCenter = chunkToPixelCoords(chunkCoords.x, chunkCoords.y)
  chunkCenter.x += CHUNK_WIDTH / 2
  chunkCenter.y += CHUNK_HEIGHT / 2
  
  const distance = Math.sqrt(
    Math.pow(chunkCenter.x - viewportCenter.x, 2) +
    Math.pow(chunkCenter.y - viewportCenter.y, 2)
  )
  
  return distance <= maxDistance
}

/**
 * Sort chunks by distance from viewport center (for loading priority)
 */
export function sortChunksByDistance(
  chunks: ChunkCoordinates[],
  viewportCenter: Position
): ChunkCoordinates[] {
  return chunks.slice().sort((a, b) => {
    const centerA = chunkToPixelCoords(a.x, a.y)
    const centerB = chunkToPixelCoords(b.x, b.y)
    
    centerA.x += CHUNK_WIDTH / 2
    centerA.y += CHUNK_HEIGHT / 2
    centerB.x += CHUNK_WIDTH / 2
    centerB.y += CHUNK_HEIGHT / 2
    
    const distanceA = Math.sqrt(
      Math.pow(centerA.x - viewportCenter.x, 2) +
      Math.pow(centerA.y - viewportCenter.y, 2)
    )
    
    const distanceB = Math.sqrt(
      Math.pow(centerB.x - viewportCenter.x, 2) +
      Math.pow(centerB.y - viewportCenter.y, 2)
    )
    
    return distanceA - distanceB
  })
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate chunk coordinates are within reasonable bounds
 */
export function isValidChunkCoords(coords: ChunkCoordinates): boolean {
  const maxCoord = 1000 // Reasonable limit for chunk coordinates
  return (
    Number.isFinite(coords.x) &&
    Number.isFinite(coords.y) &&
    Math.abs(coords.x) <= maxCoord &&
    Math.abs(coords.y) <= maxCoord
  )
}

/**
 * Validate image dimensions are reasonable
 */
export function isValidImageDimensions(width: number, height: number): boolean {
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0 &&
    width <= 2000 && // Reasonable upper bounds
    height <= 2000
  )
}

/**
 * Validate position is within reasonable bounds
 */
export function isValidPosition(position: Position): boolean {
  const maxPosition = 100000 // Reasonable limit for absolute positions
  return (
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    Math.abs(position.x) <= maxPosition &&
    Math.abs(position.y) <= maxPosition
  )
}
