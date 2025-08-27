/**
 * Masonry layout utilities for the similarity field
 * Adapted from the draggable grid masonry implementation for 2-column layout
 */

import type { PositionedImage } from '../../grid-legacy/grid/types/grid'
import {
  COLUMNS_PER_CHUNK,
  COLUMN_WIDTH,
  GAP,
  AXIS_MARGIN,
  CHUNK_HEIGHT,
  MIN_IMAGE_HEIGHT
} from './constants'

/**
 * Initialize column heights for a new chunk
 */
function initializeColumnHeights(): number[] {
  return new Array(COLUMNS_PER_CHUNK).fill(AXIS_MARGIN)
}

/**
 * Find the best column for an image (shortest column that can fit it)
 */
function findBestColumn(
  columnHeights: number[],
  imageHeight: number
): number {
  const maxY = CHUNK_HEIGHT - AXIS_MARGIN
  
  // Calculate available space in each column
  const availableSpaces = columnHeights.map(height => maxY - height)
  
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
 * Calculate masonry layout for images within a similarity field chunk
 * Optimized for 2-column layout with gap filling
 */
export function calculateSimilarityMasonryLayout(
  images: { width: number; height: number; src?: string }[]
): PositionedImage[] {
  const positions: PositionedImage[] = []
  const columnHeights = initializeColumnHeights()
  const maxY = CHUNK_HEIGHT - AXIS_MARGIN
  
  // Track which images are in which columns for gap filling
  const columnImages = new Map<number, number[]>()
  for (let i = 0; i < COLUMNS_PER_CHUNK; i++) {
    columnImages.set(i, [])
  }
  
  // First pass: Place all images in columns
  images.forEach((img, index) => {
    // Calculate the image height maintaining aspect ratio
    const aspectRatio = img.height / img.width
    const imageHeight = COLUMN_WIDTH * aspectRatio
    
    // Find best column for this image
    const columnIndex = findBestColumn(columnHeights, imageHeight)
    
    // Calculate position within chunk
    const x = AXIS_MARGIN + columnIndex * (COLUMN_WIDTH + GAP)
    const y = columnHeights[columnIndex]!
    
    // Check if we have space for at least minimum height
    const availableHeight = maxY - y
    if (availableHeight < MIN_IMAGE_HEIGHT) {
      // Skip this image if we can't fit it with minimum height
      return
    }
    
    // Constrain height to available space
    const constrainedHeight = Math.min(imageHeight, availableHeight)
    const finalHeight = Math.max(constrainedHeight, MIN_IMAGE_HEIGHT)
    
    positions[index] = { x, y, height: finalHeight }
    
    // Update column height
    columnHeights[columnIndex] = y + finalHeight + GAP
    
    // Track which column this image is in
    const colImages = columnImages.get(columnIndex) ?? []
    colImages.push(index)
    columnImages.set(columnIndex, colImages)
  })
  
  // Second pass: Stretch the last images in each column to fill gaps
  for (let colIndex = 0; colIndex < COLUMNS_PER_CHUNK; colIndex++) {
    const imagesInColumn = columnImages.get(colIndex) ?? []
    
    if (imagesInColumn.length > 0) {
      // Find the last image in this column
      const lastImageIndex = imagesInColumn[imagesInColumn.length - 1]!
      const lastImagePos = positions[lastImageIndex]
      
      if (lastImagePos) {
        // Calculate actual bottom of the last image
        const currentBottom = lastImagePos.y + lastImagePos.height
        const availableSpace = maxY - currentBottom
        
        // Stretch to fill any remaining space (no minimum threshold for similarity field)
        if (availableSpace > 0) {
          lastImagePos.height += availableSpace
        }
      }
    }
  }
  
  // Filter out any undefined positions (images that couldn't be placed)
  return positions.filter(pos => pos !== undefined)
}

/**
 * Calculate simple grid layout as fallback (original fixed grid)
 */
export function calculateSimpleGridLayout(
  imageCount: number
): PositionedImage[] {
  const positions: PositionedImage[] = []
  const cellHeight = (CHUNK_HEIGHT - (2 * AXIS_MARGIN) - (2 * GAP)) / 3
  
  for (let i = 0; i < Math.min(imageCount, 6); i++) {
    const row = Math.floor(i / COLUMNS_PER_CHUNK)
    const col = i % COLUMNS_PER_CHUNK
    
    const x = AXIS_MARGIN + col * (COLUMN_WIDTH + GAP)
    const y = AXIS_MARGIN + row * (cellHeight + GAP)
    
    positions[i] = { x, y, height: cellHeight }
  }
  
  return positions
}