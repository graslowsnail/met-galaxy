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
  SMALL_IMAGE_SIZE
} from './constants'

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
    }
    
    // If we've assigned all similar artworks, break
    if (artworkIndex >= sortedArtworks.length) break
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
 * Create similarity chunk with similar artworks arranged in grid layout
 */
export function createSimilarityChunk(
  chunkX: number,
  chunkY: number,
  artworks: SimilarArtwork[],
  randomArtworks: any[] = []
): SimilarityChunk {
  const chunkWorldPos = chunkToWorldCoordinates(chunkX, chunkY)
  const ring = getChunkRing(chunkX, chunkY)
  const images: SimilarityImageItem[] = []
  
  // Calculate grid positions within the chunk
  let currentX = CHUNK_PADDING
  let currentY = CHUNK_PADDING
  let currentRowHeight = 0
  let itemsInCurrentRow = 0
  
  // Determine how many similar vs random images based on ring
  let maxSimilarImages = 20
  let randomMixRatio = 0
  
  if (ring === 1) {
    // Ring 1: Mostly similar images with some random
    maxSimilarImages = 15
    randomMixRatio = 0.25 // 25% random
  } else if (ring === 2) {
    // Ring 2: Mix of low-similarity and random
    maxSimilarImages = 8
    randomMixRatio = 0.6 // 60% random
  } else if (ring >= 3) {
    // Ring 3+: Mostly random images with very few low-similarity
    maxSimilarImages = 3
    randomMixRatio = 0.85 // 85% random
  }
  
  // Add similar artworks first (limited by ring distance)
  for (let i = 0; i < artworks.length && images.length < maxSimilarImages; i++) {
    const artwork = artworks[i]
    const imageSize = getImageSizeForSimilarity(artwork.similarity, ring)
    
    // Check if we need to move to next row
    if (itemsInCurrentRow >= COLUMNS_PER_CHUNK || 
        currentX + imageSize > CHUNK_WIDTH - CHUNK_PADDING) {
      currentX = CHUNK_PADDING
      currentY += currentRowHeight + IMAGE_SPACING
      currentRowHeight = 0
      itemsInCurrentRow = 0
    }
    
    const image: SimilarityImageItem = {
      id: `similar-${artwork.id}-${chunkX}-${chunkY}`,
      databaseId: artwork.id,
      imageUrl: artwork.imageUrl,
      title: artwork.title,
      artist: artwork.artist,
      width: imageSize,
      height: imageSize,
      aspectRatio: 1,
      x: chunkWorldPos.x + currentX,
      y: chunkWorldPos.y + currentY,
      similarity: artwork.similarity,
      isOriginal: false,
      isFocal: false,
      imageType: 'similar',
      gridSize: imageSize > 200 ? 'large' : imageSize > 150 ? 'medium' : 'small'
    }
    
    images.push(image)
    
    currentX += imageSize + IMAGE_SPACING
    currentRowHeight = Math.max(currentRowHeight, imageSize)
    itemsInCurrentRow++
  }
  
  // Fill remaining space with random artworks for all rings
  if (randomArtworks.length > 0) {
    const remainingSlots = 20 - images.length
    
    for (let i = 0; i < Math.min(remainingSlots, randomArtworks.length); i++) {
      const randomArtwork = randomArtworks[i % randomArtworks.length]
      // Use ring-appropriate image size for random images too
      let imageSize = SIMILARITY_ZONES.RANDOM_ZONE.imageSize
      if (ring === 1) {
        imageSize = Math.random() > 0.5 ? MEDIUM_IMAGE_SIZE : SMALL_IMAGE_SIZE
      } else if (ring === 2) {
        imageSize = SMALL_IMAGE_SIZE
      } else {
        imageSize = SMALL_IMAGE_SIZE
      }
      
      // Check if we need to move to next row
      if (itemsInCurrentRow >= COLUMNS_PER_CHUNK || 
          currentX + imageSize > CHUNK_WIDTH - CHUNK_PADDING) {
        currentX = CHUNK_PADDING
        currentY += currentRowHeight + IMAGE_SPACING
        currentRowHeight = 0
        itemsInCurrentRow = 0
      }
      
      const image: SimilarityImageItem = {
        id: `random-${randomArtwork.id}-${chunkX}-${chunkY}-${i}`,
        databaseId: randomArtwork.id,
        imageUrl: randomArtwork.imageUrl || randomArtwork.primaryImage || '',
        title: randomArtwork.title || 'Untitled',
        artist: randomArtwork.artist || 'Unknown Artist',
        similarity: 0, // Add similarity property for random images
        width: imageSize,
        height: imageSize,
        aspectRatio: 1,
        x: chunkWorldPos.x + currentX,
        y: chunkWorldPos.y + currentY,
        isOriginal: false,
        isFocal: false,
        imageType: 'random',
        gridSize: 'small'
      }
      
      images.push(image)
      
      currentX += imageSize + IMAGE_SPACING
      currentRowHeight = Math.max(currentRowHeight, imageSize)
      itemsInCurrentRow++
    }
  }
  
  // Calculate chunk metadata
  const similarImages = images.filter(img => img.imageType === 'similar')
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
    images,
    isVisible: false,
    chunkType,
    averageSimilarity
  }
}