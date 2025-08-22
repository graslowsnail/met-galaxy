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
 * Calculate optimal layout for a batch of images within a chunk
 * This pre-calculates positions for better space utilization
 */
export function calculateOptimalChunkLayout(
  images: { width: number; height: number }[],
  chunkX: number,
  chunkY: number
): PositionedImage[] {
  const positions: PositionedImage[] = []
  const columnHeights = initializeColumnHeights()
  const baseY = GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT)
  const maxY = baseY + CHUNK_HEIGHT - AXIS_MARGIN
  
  // Track which images are in which columns
  const columnImages: Map<number, number[]> = new Map()
  for (let i = 0; i < COLUMNS_PER_CHUNK; i++) {
    columnImages.set(i, [])
  }
  
  // First pass: Place all images normally
  images.forEach((img, index) => {
    const result = calculateImagePosition(
      columnHeights,
      img.width,
      img.height,
      chunkX,
      chunkY
    )
    
    if (result) {
      positions[index] = result.position
      columnHeights[result.columnIndex] = columnHeights[result.columnIndex]! + result.position.height + GAP
      
      // Track which column this image is in
      const columnImagesList = columnImages.get(result.columnIndex) || []
      columnImagesList.push(index)
      columnImages.set(result.columnIndex, columnImagesList)
    }
  })
  
  // Second pass: Stretch the last images in each column to fill gaps
  for (let colIndex = 0; colIndex < COLUMNS_PER_CHUNK; colIndex++) {
    const imagesInColumn = columnImages.get(colIndex) || []
    
    if (imagesInColumn.length > 0) {
      // Find the last image in this column
      const lastImageIndex = imagesInColumn[imagesInColumn.length - 1]!
      const lastImagePos = positions[lastImageIndex]
      
      if (lastImagePos) {
        // Calculate actual bottom of the last image
        const currentBottom = lastImagePos.y + lastImagePos.height
        const availableSpace = maxY - currentBottom
        
        // Only stretch if there's meaningful space to fill (>20px)
        if (availableSpace > 20) {
          // Simply extend the last image to fill the remaining space
          lastImagePos.height += availableSpace
        }
      }
    }
  }
  
  return positions
}

/**
 * Find the best column for an image considering height and balance
 */
function findBestColumn(
  columnHeights: number[],
  imageHeight: number,
  chunkHeight: number
): number {
  const baseY = GRID_ORIGIN_Y
  const maxY = baseY + chunkHeight - AXIS_MARGIN
  
  // Calculate available space in each column
  const availableSpaces = columnHeights.map(height => maxY - (baseY + height))
  
  // Filter columns that can fit the image
  const validColumns = availableSpaces
    .map((space, index) => ({ index, space, currentHeight: columnHeights[index]! }))
    .filter(col => col.space >= imageHeight + MIN_IMAGE_HEIGHT)
  
  if (validColumns.length === 0) {
    // Fallback to shortest column if no column can fit the full image
    return columnHeights.indexOf(Math.min(...columnHeights))
  }
  
  // Sort by current height (shortest first) to maintain balance
  validColumns.sort((a, b) => a.currentHeight - b.currentHeight)
  
  // Return the shortest valid column
  return validColumns[0]!.index
}

/**
 * Calculate the position for an image within a chunk using improved masonry layout
 */
export function calculateImagePosition(
  columnHeights: number[],
  imageWidth: number,
  imageHeight: number,
  chunkX: number,
  chunkY: number
): { position: PositionedImage; columnIndex: number } | null {
  const columnIndex = findBestColumn(columnHeights, imageHeight, CHUNK_HEIGHT)
  const baseX = GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH)
  const baseY = GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT)
  
  // Calculate local position within chunk based on chunk orientation
  let localX: number, localY: number
  
  if (chunkX < 0) {
    // For negative X chunks, position from right edge
    localX = CHUNK_WIDTH - AXIS_MARGIN - (columnIndex + 1) * (COLUMN_WIDTH + GAP)
    localY = columnHeights[columnIndex]!
  } else {
    // For positive X chunks, position from left edge  
    localX = AXIS_MARGIN + columnIndex * (COLUMN_WIDTH + GAP)
    localY = columnHeights[columnIndex]!
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
    columnIndex: columnIndex,
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
 * Generate a deterministic aspect ratio based on position with better variety
 */
export function generateAspectRatio(chunkX: number, chunkY: number, imageIndex: number): number {
  // Create more variety by using a more complex seed
  const seed = Math.abs(chunkX * 1337 + chunkY * 271 + imageIndex * 73)
  
  // Use a mix of standard and varied ratios for visual interest
  const extendedRatios = [
    0.5,   // Very tall
    0.6,   // Tall
    0.7,   // Portrait
    0.75,  // Classic portrait
    0.8,   // Slight portrait
    1.0,   // Square
    1.2,   // Slight landscape
    1.33,  // Classic landscape
    1.5,   // Landscape
    1.6,   // Wide
    1.78,  // Widescreen
    2.0    // Very wide
  ]
  
  // Add some controlled randomness within chunks
  const chunkVariation = (chunkX + chunkY) % 3
  const adjustedIndex = seed + chunkVariation
  
  return extendedRatios[adjustedIndex % extendedRatios.length]!
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
