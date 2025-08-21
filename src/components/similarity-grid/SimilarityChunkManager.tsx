/**
 * SimilarityChunkManager - Chunk manager for similarity-based infinite grid
 * 
 * Similar to the main ChunkManager but uses similarity data instead of
 * random artworks and places the original image prominently at center.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useVirtualization } from '../grid-legacy/grid/hooks/useVirtualization'
import GridRenderer from '../grid-legacy/grid/GridRenderer'
import type { 
  Chunk, 
  ChunkCoordinates, 
  ImageItem, 
  PositionedImage,
  ViewportState
} from '../grid-legacy/grid/types/grid'
import {
  generateImageId,
  generateAspectRatio,
  calculateImageDimensions,
  calculateBoundingBox,
  calculateOptimalChunkLayout,
  chunkToPixelCoords,
} from '../grid-legacy/grid/utils/chunkCalculations'
import { 
  COLUMN_WIDTH,
  CHUNK_SIZE,
  CHUNK_HEIGHT,
  DEBUG_LOGGING,
  CHUNK_WIDTH
} from '../grid-legacy/grid/utils/constants'
import type { SimilarityResponse, SimilarArtwork } from '@/types/api'

interface SimilarityChunkManagerProps {
  /** Current viewport state from useViewport hook */
  viewport: ViewportState
  /** Whether dragging is currently active */
  isDragging: boolean
  /** Whether viewport is initialized */
  isInitialized: boolean
  /** Callback when an image is clicked */
  onImageClick?: (image: ImageItem, event: React.MouseEvent) => void
  /** Whether to show performance overlay */
  showPerformanceOverlay?: boolean
  /** Similarity data from API */
  similarityData: SimilarityResponse
}

/**
 * Convert SimilarArtwork to ImageItem for chunk system
 */
function convertSimilarArtworkToImageItem(
  artwork: SimilarArtwork, 
  chunkX: number, 
  chunkY: number, 
  localIndex: number
): ImageItem {
  const aspectRatio = generateAspectRatio(chunkX, chunkY, localIndex)
  const { width, height } = calculateImageDimensions(aspectRatio)

  return {
    id: generateImageId('artwork', chunkX, chunkY, localIndex, artwork.id),
    src: artwork.imageUrl,
    width,
    height,
    aspectRatio,
    chunkX,
    chunkY,
    localIndex,
    databaseId: artwork.id,
    objectId: artwork.objectId,
    title: artwork.title,
    artist: artwork.artist,
    date: '',
    department: '',
    culture: '',
    medium: '',
  }
}

/**
 * Create center chunk with original image in the middle and similar images around it
 */
function createCenterChunk(originalArtwork: SimilarArtwork, topSimilarArtworks: SimilarArtwork[]): Chunk {
  const chunkX = 0
  const chunkY = 0
  
  const images: ImageItem[] = []
  const positions: PositionedImage[] = []
  
  // 1. Create large center image (original)
  const centerImage: ImageItem = {
    id: generateImageId('artwork', chunkX, chunkY, 0, originalArtwork.id),
    src: originalArtwork.imageUrl,
    width: 350, // Large but not too large to leave room for others
    height: 350,
    aspectRatio: 1,
    chunkX,
    chunkY,
    localIndex: 0,
    databaseId: originalArtwork.id,
    objectId: originalArtwork.objectId,
    title: originalArtwork.title,
    artist: originalArtwork.artist,
    date: '',
    department: '',
    culture: '',
    medium: '',
  }
  
  // Position center image at exact middle of chunk (world coordinates)
  const chunkWorldCoords = chunkToPixelCoords(chunkX, chunkY)
  const centerPosition = {
    x: chunkWorldCoords.x + (CHUNK_WIDTH / 2) - 175, // Center the 350px image in chunk
    y: chunkWorldCoords.y + (CHUNK_HEIGHT / 2) - 175,
    height: 350
  }
  
  images.push(centerImage)
  positions.push(centerPosition)
  
  // 2. Add the most similar images around the center image
  // We'll place them in strategic positions around the center
  const surroundingPositions: Array<{ x: number; y: number; width: number; height: number }> = [
    // Top row
    { x: -550, y: -400, width: 200, height: 250 },
    { x: -300, y: -450, width: 180, height: 200 },
    { x: 150, y: -400, width: 200, height: 280 },
    { x: 400, y: -450, width: 180, height: 220 },
    
    // Middle row (left and right of center)
    { x: -600, y: -100, width: 220, height: 300 },
    { x: -350, y: 50, width: 160, height: 200 },
    { x: 200, y: -50, width: 180, height: 240 },
    { x: 450, y: 100, width: 200, height: 260 },
    
    // Bottom row  
    { x: -520, y: 250, width: 190, height: 240 },
    { x: -280, y: 300, width: 200, height: 200 },
    { x: 180, y: 280, width: 170, height: 220 },
    { x: 420, y: 320, width: 180, height: 180 },
    
    // Additional positions for more images
    { x: -450, y: 600, width: 160, height: 200 },
    { x: -200, y: 650, width: 180, height: 160 },
    { x: 100, y: 620, width: 170, height: 190 },
    { x: 350, y: 600, width: 160, height: 200 },
  ]
  
  // Take up to 16 similar images to fill around the center
  const imagesToPlace = Math.min(topSimilarArtworks.length, surroundingPositions.length)
  
  for (let i = 0; i < imagesToPlace; i++) {
    const artwork = topSimilarArtworks[i]!
    const pos = surroundingPositions[i]!
    
    const similarImage: ImageItem = {
      id: generateImageId('artwork', chunkX, chunkY, i + 1, artwork.id),
      src: artwork.imageUrl,
      width: pos.width,
      height: pos.height,
      aspectRatio: pos.width / pos.height,
      chunkX,
      chunkY,
      localIndex: i + 1,
      databaseId: artwork.id,
      objectId: artwork.objectId,
      title: artwork.title,
      artist: artwork.artist,
      date: '',
      department: '',
      culture: '',
      medium: '',
    }
    
    const similarPosition = {
      x: chunkWorldCoords.x + (CHUNK_WIDTH / 2) + pos.x, // Position relative to chunk center
      y: chunkWorldCoords.y + (CHUNK_HEIGHT / 2) + pos.y,
      height: pos.height
    }
    
    images.push(similarImage)
    positions.push(similarPosition)
  }

  return {
    id: `chunk-${chunkX}-${chunkY}`,
    x: chunkX,
    y: chunkY,
    images,
    positions,
    bounds: calculateBoundingBox(positions, 350), // Use center image width for bounds
    actualHeight: CHUNK_HEIGHT
  }
}

/**
 * Create chunks around center with similar images
 */
function createSimilarityChunk(
  chunkX: number,
  chunkY: number,
  similarArtworks: SimilarArtwork[],
  startIndex: number
): Chunk {
  // Get artworks for this chunk
  const artworksForChunk = similarArtworks.slice(startIndex, startIndex + CHUNK_SIZE)
  
  if (artworksForChunk.length === 0) {
    // Return empty chunk
    return {
      id: `chunk-${chunkX}-${chunkY}`,
      x: chunkX,
      y: chunkY,
      images: [],
      positions: [],
      bounds: calculateBoundingBox([]),
      actualHeight: CHUNK_HEIGHT
    }
  }
  
  // Convert to ImageItems
  const images = artworksForChunk.map((artwork, i) => 
    convertSimilarArtworkToImageItem(artwork, chunkX, chunkY, i)
  )
  
  // Calculate positions using the same layout system
  const positions = calculateOptimalChunkLayout(
    images.map(img => ({ width: img.width, height: img.height })),
    chunkX,
    chunkY
  )

  return {
    id: `chunk-${chunkX}-${chunkY}`,
    x: chunkX,
    y: chunkY,
    images,
    positions,
    bounds: calculateBoundingBox(positions, COLUMN_WIDTH),
    actualHeight: CHUNK_HEIGHT
  }
}

const SimilarityChunkManager = memo(function SimilarityChunkManager({
  viewport,
  isDragging,
  isInitialized,
  onImageClick,
  showPerformanceOverlay = true,
  similarityData
}: SimilarityChunkManagerProps) {
  
  // Core chunk state
  const [chunks, setChunks] = useState<Map<string, Chunk>>(new Map())
  
  // Use virtualization hook (same as main grid)
  const { 
    visibleChunks,
    chunksToLoad,
    updateVirtualization
  } = useVirtualization({
    viewport,
    isDragging,
    isInitialized,
    chunks,
    setChunks
  })

  // Organize similarity data
  const originalArtwork = similarityData.data.find(artwork => artwork.original)
  const allSimilarArtworks = similarityData.data
    .filter(artwork => !artwork.original)
    .sort((a, b) => b.similarity - a.similarity) // Most similar first

  if (DEBUG_LOGGING) {
    console.log('🎯 Similarity data organized:', {
      total: similarityData.data.length,
      original: originalArtwork?.title,
      similarCount: allSimilarArtworks.length,
      topSimilarity: allSimilarArtworks[0]?.similarity
    })
  }

  // Split similar artworks: top 16 for center chunk, rest for surrounding chunks
  const topSimilarArtworks = allSimilarArtworks.slice(0, 16) // Most similar for center chunk
  const remainingSimilarArtworks = allSimilarArtworks.slice(16) // Rest for surrounding chunks

  // Create chunks from similarity data
  const createChunks = useCallback((coords: ChunkCoordinates[]) => {
    if (DEBUG_LOGGING) {
      console.log(`📦 SimilarityChunkManager: Creating ${coords.length} chunks`)
    }
    
    const newChunks: Chunk[] = []
    
    coords.forEach((coord) => {
      const chunkKey = `${coord.x},${coord.y}`
      
      if (!chunks.has(chunkKey)) {
        let chunk: Chunk
        
        if (coord.x === 0 && coord.y === 0) {
          // Center chunk with original image in middle + 16 most similar around it
          chunk = createCenterChunk(originalArtwork!, topSimilarArtworks)
          if (DEBUG_LOGGING) {
            console.log(`📍 Created center chunk with ${chunk.images.length} images`)
          }
        } else {
          // Surrounding chunks with remaining similar images
          // Calculate which images to use for this chunk  
          const chunkIndex = Math.abs(coord.x) + Math.abs(coord.y) - 1 // -1 because center chunk doesn't count
          const startIndex = chunkIndex * CHUNK_SIZE
          
          chunk = createSimilarityChunk(coord.x, coord.y, remainingSimilarArtworks, startIndex)
          if (DEBUG_LOGGING) {
            console.log(`📍 Created chunk (${coord.x},${coord.y}) with ${chunk.images.length} images`)
          }
        }
        
        if (chunk.images.length > 0) {
          newChunks.push(chunk)
        }
      }
    })
    
    // Update chunks state
    if (newChunks.length > 0) {
      setChunks(prev => {
        const updated = new Map(prev)
        newChunks.forEach(chunk => {
          const chunkKey = `${chunk.x},${chunk.y}`
          updated.set(chunkKey, chunk)
        })
        return updated
      })
    }
  }, [chunks, originalArtwork, topSimilarArtworks, remainingSimilarArtworks])

  // Store createChunks in a ref to avoid dependency issues
  const createChunksRef = useRef(createChunks)
  createChunksRef.current = createChunks

  // Create chunks when chunksToLoad changes
  useEffect(() => {
    if (chunksToLoad.length > 0) {
      createChunksRef.current(chunksToLoad)
    }
  }, [chunksToLoad])

  // Store updateVirtualization in ref to avoid dependency cycles
  const updateVirtualizationRef = useRef(updateVirtualization)
  updateVirtualizationRef.current = updateVirtualization

  // Initial virtualization trigger when initialized
  useEffect(() => {
    if (isInitialized && !isDragging) {
      if (DEBUG_LOGGING) {
        console.log('🚀 SimilarityChunkManager: Initial virtualization trigger')
      }
      updateVirtualizationRef.current()
    }
  }, [isInitialized, isDragging])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setChunks(new Map())
    }
    
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Calculate current translation position for rendering
  const translate = {
    x: viewport.translateX,
    y: viewport.translateY
  }

  if (DEBUG_LOGGING) {
    console.log(`🎛️ SimilarityChunkManager: Rendering ${chunks.size} chunks, ${visibleChunks.length} visible, ${chunksToLoad.length} to load`)
  }

  return (
    <GridRenderer
      chunks={chunks}
      translate={translate}
      isDragging={isDragging}
      onImageClick={onImageClick}
      loadingChunks={new Set()}
      chunksToLoad={chunksToLoad}
      visibleChunks={visibleChunks.length}
      chunkDataMap={new Map()}
      showPerformanceOverlay={showPerformanceOverlay}
    />
  )
})

// Add display name for better debugging
SimilarityChunkManager.displayName = 'SimilarityChunkManager'

export default SimilarityChunkManager