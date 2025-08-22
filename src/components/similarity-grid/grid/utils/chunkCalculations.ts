/**
 * Chunk calculations for Similarity Grid
 * 
 * This module handles the grid-based layout calculations for similarity exploration,
 * creating a structured grid layout similar to the main draggable grid but optimized
 * for focal image display and similarity-based image placement.
 */

import type { 
  SimilarityImageItem, 
  SimilarityChunk, 
  SimilarityLayoutConfig,
  Position,
  ViewportBounds
} from '../types/similarity'
import type { SimilarArtwork } from '@/types/api'
import {
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  COLUMNS_PER_CHUNK,
  COLUMN_WIDTH,
  FOCAL_IMAGE_SIZE,
  FOCAL_IMAGE_OFFSET_X,
  FOCAL_IMAGE_OFFSET_Y,
  SIMILARITY_ZONES,
  CHUNK_POSITIONS,
  IMAGE_SPACING,
  CHUNK_PADDING,
  GRID_ORIGIN_X,
  GRID_ORIGIN_Y,
  LARGE_IMAGE_SIZE,
  MEDIUM_IMAGE_SIZE,
  SMALL_IMAGE_SIZE,
  DEBUG_LOGGING
} from './constants'

// Masonry layout constants (matching main grid)
const GAP = 16
const AXIS_MARGIN = 15
const MIN_IMAGE_HEIGHT = 100

// ============================================================================
// GRID COORDINATE CALCULATIONS
// ============================================================================

/**
 * Convert chunk coordinates to world pixel coordinates
 */
export function chunkToWorldCoordinates(chunkX: number, chunkY: number): Position {
  return {
    x: GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH),
    y: GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT)
  }
}

/**
 * Convert world pixel coordinates to chunk coordinates
 */
export function worldToChunkCoordinates(worldX: number, worldY: number): Position {
  return {
    x: Math.floor((worldX - GRID_ORIGIN_X) / CHUNK_WIDTH),
    y: Math.floor((worldY - GRID_ORIGIN_Y) / CHUNK_HEIGHT)
  }
}

/**
 * Calculate which chunks are visible in the current viewport
 */
export function getVisibleChunks(viewportBounds: ViewportBounds): Position[] {
  const topLeftChunk = worldToChunkCoordinates(viewportBounds.left, viewportBounds.top)
  const bottomRightChunk = worldToChunkCoordinates(viewportBounds.right, viewportBounds.bottom)
  
  const visibleChunks: Position[] = []
  
  for (let chunkY = topLeftChunk.y; chunkY <= bottomRightChunk.y; chunkY++) {
    for (let chunkX = topLeftChunk.x; chunkX <= bottomRightChunk.x; chunkX++) {
      visibleChunks.push({ x: chunkX, y: chunkY })
    }
  }
  
  return visibleChunks
}

// ============================================================================
// MASONRY LAYOUT FUNCTIONS (Adapted from main grid)
// ============================================================================

/**
 * Generate deterministic aspect ratio for image variety
 */
function generateAspectRatio(chunkX: number, chunkY: number, imageIndex: number): number {
  const seed = Math.abs(chunkX * 1337 + chunkY * 271 + imageIndex * 73)
  const extendedRatios = [0.5, 0.6, 0.7, 0.75, 0.8, 1.0, 1.2, 1.33, 1.5, 1.6, 1.78, 2.0]
  return extendedRatios[seed % extendedRatios.length]
}

/**
 * Calculate image dimensions based on aspect ratio
 */
function calculateImageDimensions(aspectRatio: number) {
  const height = Math.max(MIN_IMAGE_HEIGHT, Math.round(COLUMN_WIDTH / aspectRatio))
  return { width: COLUMN_WIDTH, height }
}

/**
 * Find the best column for placing an image
 */
function findBestColumn(columnHeights: number[], imageHeight: number, maxHeight: number): number {
  const availableSpace = columnHeights.map(height => maxHeight - height)
  const validColumns = columnHeights
    .map((height, index) => ({ index, height, available: availableSpace[index] }))
    .filter(col => col.available >= imageHeight + GAP)

  if (validColumns.length > 0) {
    validColumns.sort((a, b) => a.height - b.height)
    return validColumns[0].index
  }

  // Fallback to shortest column if no perfect fit
  let shortestIndex = 0
  for (let i = 1; i < columnHeights.length; i++) {
    if (columnHeights[i] < columnHeights[shortestIndex]) {
      shortestIndex = i
    }
  }
  return shortestIndex
}

/**
 * Apply masonry layout to images within a chunk
 */
function applyMasonryLayout(
  images: SimilarityImageItem[],
  chunkX: number,
  chunkY: number,
  baseX: number,
  baseY: number
): SimilarityImageItem[] {
  const columnHeights = new Array(COLUMNS_PER_CHUNK).fill(AXIS_MARGIN)
  const positionedImages: SimilarityImageItem[] = []

  images.forEach((image, index) => {
    // Generate deterministic aspect ratio for variety
    const aspectRatio = generateAspectRatio(chunkX, chunkY, index)
    const dimensions = calculateImageDimensions(aspectRatio)
    
    // Find best column for this image
    const columnIndex = findBestColumn(columnHeights, dimensions.height, CHUNK_HEIGHT)
    
    // Calculate position
    let localX: number
    if (chunkX >= 0) {
      // Positive chunks: columns left-to-right from left edge
      localX = AXIS_MARGIN + columnIndex * (COLUMN_WIDTH + GAP)
    } else {
      // Negative chunks: columns right-to-left from right edge  
      localX = CHUNK_WIDTH - AXIS_MARGIN - (columnIndex + 1) * (COLUMN_WIDTH + GAP) + GAP
    }
    
    const localY = columnHeights[columnIndex]
    
    // Create positioned image
    const positionedImage: SimilarityImageItem = {
      ...image,
      width: dimensions.width,
      height: dimensions.height,
      aspectRatio,
      x: baseX + localX,
      y: baseY + localY
    }
    
    positionedImages.push(positionedImage)
    
    // Update column height
    columnHeights[columnIndex] += dimensions.height + GAP
  })

  return positionedImages
}

// ============================================================================
// SIMILARITY-BASED LAYOUT LOGIC
// ============================================================================

/**
 * Determine which ring a chunk position belongs to relative to focal chunk (0,0)
 */
export function getChunkRing(chunkX: number, chunkY: number): number {
  return Math.max(Math.abs(chunkX), Math.abs(chunkY))
}

/**
 * Get the appropriate image size based on similarity score and distance from focal
 */
export function getImageSizeForSimilarity(similarity: number, ring: number): number {
  if (ring === 0) return FOCAL_IMAGE_SIZE // Focal chunk
  
  if (similarity >= SIMILARITY_ZONES.HIGH_SIMILARITY.minSimilarity && ring <= 1) {
    return SIMILARITY_ZONES.HIGH_SIMILARITY.imageSize
  }
  
  if (similarity >= SIMILARITY_ZONES.MEDIUM_SIMILARITY.minSimilarity && ring <= 2) {
    return SIMILARITY_ZONES.MEDIUM_SIMILARITY.imageSize
  }
  
  if (similarity >= SIMILARITY_ZONES.LOW_SIMILARITY.minSimilarity && ring <= 3) {
    return SIMILARITY_ZONES.LOW_SIMILARITY.imageSize
  }
  
  return SIMILARITY_ZONES.RANDOM_ZONE.imageSize
}

/**
 * Assign similar artworks to appropriate chunks based on similarity scores
 */
export function assignSimilarArtworksToChunks(
  similarArtworks: SimilarArtwork[],
  focalArtwork: SimilarArtwork
): Map<string, SimilarArtwork[]> {
  const chunkAssignments = new Map<string, SimilarArtwork[]>()
  
  // Sort artworks by similarity score (highest first)
  const sortedArtworks = [...similarArtworks]
    .filter(artwork => !artwork.original) // Exclude focal image
    .sort((a, b) => b.similarity - a.similarity)
  
  if (DEBUG_LOGGING) {
    console.log(`📋 assignSimilarArtworksToChunks: ${sortedArtworks.length} similar artworks to assign`)
    console.log(`   First few similarities:`, sortedArtworks.slice(0, 5).map(a => a.similarity))
  }
  
  // Define chunk assignment order (rings expanding outward)
  const assignmentOrder = [
    ...CHUNK_POSITIONS.RING_1,
    ...CHUNK_POSITIONS.RING_2, 
    ...CHUNK_POSITIONS.RING_3
  ]
  
  let artworkIndex = 0
  
  // Assign artworks to chunks in order of decreasing similarity
  for (const chunkPos of assignmentOrder) {
    const chunkKey = `${chunkPos.x},${chunkPos.y}`
    const ring = getChunkRing(chunkPos.x, chunkPos.y)
    
    // Determine how many similar artworks this chunk should get
    const chunkArtworks: SimilarArtwork[] = []
    const maxArtworksForRing = getMaxArtworksForRing(ring)
    
    // Fill chunk with artworks that match the similarity threshold for this ring
    let addedToChunk = 0
    while (artworkIndex < sortedArtworks.length && addedToChunk < 20) {
      const artwork = sortedArtworks[artworkIndex]
      const minSimilarityForRing = getMinSimilarityForRing(ring)
      
      if (artwork.similarity >= minSimilarityForRing) {
        chunkArtworks.push(artwork)
        addedToChunk++
        artworkIndex++
      } else {
        break // Remaining artworks are below threshold for this ring
      }
    }
    
    if (chunkArtworks.length > 0) {
      chunkAssignments.set(chunkKey, chunkArtworks)
      if (DEBUG_LOGGING) {
        console.log(`   Assigned ${chunkArtworks.length} artworks to chunk ${chunkKey} (Ring ${ring})`)
      }
    } else if (DEBUG_LOGGING) {
      console.log(`   No artworks assigned to chunk ${chunkKey} (Ring ${ring}) - ${sortedArtworks.length - artworkIndex} remaining`)
    }
    
    // If we've assigned all similar artworks, break
    if (artworkIndex >= sortedArtworks.length) break
  }
  
  if (DEBUG_LOGGING) {
    console.log(`📋 Final assignments: ${chunkAssignments.size} chunks with similar artworks`)
    chunkAssignments.forEach((artworks, chunkKey) => {
      console.log(`   ${chunkKey}: ${artworks.length} artworks`)
    })
  }
  
  return chunkAssignments
}

function getMaxArtworksForRing(ring: number): number {
  if (ring <= 1) return SIMILARITY_ZONES.HIGH_SIMILARITY.maxImages
  if (ring <= 2) return SIMILARITY_ZONES.MEDIUM_SIMILARITY.maxImages
  if (ring <= 3) return SIMILARITY_ZONES.LOW_SIMILARITY.maxImages
  return 20 // Default chunk size
}

function getMinSimilarityForRing(ring: number): number {
  if (ring <= 1) return SIMILARITY_ZONES.HIGH_SIMILARITY.minSimilarity
  if (ring <= 2) return SIMILARITY_ZONES.MEDIUM_SIMILARITY.minSimilarity
  if (ring <= 3) return SIMILARITY_ZONES.LOW_SIMILARITY.minSimilarity
  return 0 // Random zone accepts any similarity
}

// ============================================================================
// CHUNK CREATION
// ============================================================================

/**
 * Create focal chunk containing the main focal image
 */
export function createFocalChunk(focalArtwork: SimilarArtwork): SimilarityChunk {
  const chunkWorldPos = chunkToWorldCoordinates(0, 0)
  
  const focalImage: SimilarityImageItem = {
    id: `focal-${focalArtwork.id}`,
    databaseId: focalArtwork.id,
    imageUrl: focalArtwork.imageUrl,
    title: focalArtwork.title,
    artist: focalArtwork.artist,
    width: FOCAL_IMAGE_SIZE,
    height: FOCAL_IMAGE_SIZE,
    aspectRatio: 1,
    x: chunkWorldPos.x + FOCAL_IMAGE_OFFSET_X,
    y: chunkWorldPos.y + FOCAL_IMAGE_OFFSET_Y,
    similarity: 1.0,
    isOriginal: true,
    isFocal: true,
    imageType: 'focal',
    gridSize: 'large'
  }
  
  return {
    id: '0,0',
    x: 0,
    y: 0,
    images: [focalImage],
    isVisible: true,
    chunkType: 'focal',
    focalImageId: focalArtwork.id,
    averageSimilarity: 1.0
  }
}

/**
 * Create similarity chunk with masonry layout (like main grid)
 */
export function createSimilarityChunk(
  chunkX: number,
  chunkY: number,
  artworks: SimilarArtwork[],
  randomArtworks: any[] = []
): SimilarityChunk {
  const chunkWorldPos = chunkToWorldCoordinates(chunkX, chunkY)
  const ring = getChunkRing(chunkX, chunkY)
  const rawImages: SimilarityImageItem[] = []
  
  // Determine how many similar vs random images based on ring
  let maxSimilarImages = 20
  
  if (ring === 1) {
    // Ring 1: All similar images (20 per chunk as requested)
    maxSimilarImages = 20
  } else if (ring === 2) {
    // Ring 2: Mix of low-similarity and random
    maxSimilarImages = 8
  } else if (ring >= 3) {
    // Ring 3+: Mostly random images with very few low-similarity
    maxSimilarImages = 3
  }
  
  // Create image items (without positioning) for similar artworks
  for (let i = 0; i < artworks.length && rawImages.length < maxSimilarImages; i++) {
    const artwork = artworks[i]
    
    const image: SimilarityImageItem = {
      id: `similar-${artwork.id}-${chunkX}-${chunkY}`,
      databaseId: artwork.id,
      imageUrl: artwork.imageUrl,
      title: artwork.title,
      artist: artwork.artist,
      width: COLUMN_WIDTH, // Will be set by masonry layout
      height: 200,        // Will be set by masonry layout  
      aspectRatio: 1,     // Will be set by masonry layout
      x: 0,               // Will be set by masonry layout
      y: 0,               // Will be set by masonry layout
      similarity: artwork.similarity,
      isOriginal: false,
      isFocal: false,
      imageType: 'similar',
      gridSize: 'medium'
    }
    
    rawImages.push(image)
  }
  
  // Fill remaining slots with random artworks
  if (randomArtworks.length > 0) {
    const remainingSlots = 20 - rawImages.length
    
    for (let i = 0; i < Math.min(remainingSlots, randomArtworks.length); i++) {
      const randomArtwork = randomArtworks[i % randomArtworks.length]
      
      const image: SimilarityImageItem = {
        id: `random-${randomArtwork.id}-${chunkX}-${chunkY}-${i}`,
        databaseId: randomArtwork.id,
        imageUrl: randomArtwork.imageUrl || randomArtwork.primaryImage || '',
        title: randomArtwork.title || 'Untitled',
        artist: randomArtwork.artist || 'Unknown Artist',
        similarity: 0,
        width: COLUMN_WIDTH, // Will be set by masonry layout
        height: 200,        // Will be set by masonry layout
        aspectRatio: 1,     // Will be set by masonry layout
        x: 0,               // Will be set by masonry layout
        y: 0,               // Will be set by masonry layout
        isOriginal: false,
        isFocal: false,
        imageType: 'random',
        gridSize: 'small'
      }
      
      rawImages.push(image)
    }
  }
  
  // Apply masonry layout to position all images
  const positionedImages = applyMasonryLayout(
    rawImages,
    chunkX,
    chunkY,
    chunkWorldPos.x,
    chunkWorldPos.y
  )
  
  // Calculate chunk metadata
  const similarImages = positionedImages.filter(img => img.imageType === 'similar')
  const averageSimilarity = similarImages.length > 0 
    ? similarImages.reduce((sum, img) => sum + (img.similarity || 0), 0) / similarImages.length
    : 0
  
  const chunkType = ring === 0 ? 'focal' 
                 : ring <= 2 ? 'similar'
                 : ring === 3 ? 'mixed'
                 : 'random'
  
  return {
    id: `${chunkX},${chunkY}`,
    x: chunkX,
    y: chunkY,
    images: positionedImages,
    isVisible: false,
    chunkType,
    averageSimilarity
  }
}