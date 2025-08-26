/**
 * Simplified SimilarityChunkManager - Based on draggable grid's ChunkManager
 * Updated with streaming/progressive loading approach
 * 
 * This version implements progressive loading like the draggable grid while
 * maintaining reasonable deduplication for the similarity context.
 */

import React, { memo, useCallback, useEffect, useRef } from 'react'
import { useSimilarityChunkDataSimple } from './hooks/useSimilarityChunkDataSimple'
import { useVirtualization } from './hooks/useVirtualization'
import SimilarityGridRenderer from './SimilarityGridRenderer'
import type { 
  Chunk, 
  ChunkCoordinates, 
  ImageItem, 
  Position,
  ViewportState
} from '../grid-legacy/grid/types/grid'

// Extend Chunk type to support focal chunks
interface SimilarityChunk extends Chunk {
  isFocal?: boolean
}
import {
  generateImageId,
  generateAspectRatio,
  calculateImageDimensions,
  calculateBoundingBox,
  calculateOptimalChunkLayout,
} from '../grid-legacy/grid/utils/chunkCalculations'
import { calculateSimpleGridLayout } from './utils/chunkCalculations'
import { 
  COLUMN_WIDTH,
  CHUNK_SIZE,
  CHUNK_WIDTH,
  CHUNK_HEIGHT,
  COLUMNS_PER_CHUNK,
  ROWS_PER_CHUNK,
  FOCAL_CHUNK_SIZE,
  DEBUG_LOGGING
} from './utils/constants'
import type { Artwork } from '@/types/api'

interface SimilarityChunkManagerProps {
  /** Current viewport state from useViewport hook */
  viewport: ViewportState
  /** Whether dragging is currently active */
  isDragging: boolean
  /** Whether viewport is initialized */
  isInitialized: boolean
  /** Focal artwork ID that user clicked */
  focalArtworkId: number
  /** Focal artwork data for the center chunk */
  focalArtwork?: {
    id: number
    title: string | null
    artist: string | null
    date?: string | null
    department?: string | null
    creditLine?: string | null
    description?: string | null
    imageUrl: string | null
    originalImageUrl: string | null
  }
  /** Callback when an image is clicked */
  onImageClick?: (image: ImageItem, event: React.MouseEvent) => void
  /** Callback when focal artwork position is determined */
  onFocalArtworkPosition?: (position: { x: number; y: number; chunkX: number; chunkY: number }) => void
}

/**
 * Generate image items from artwork data - Same as draggable grid
 */
function generateChunkImagesFromArtworks(chunkX: number, chunkY: number, artworks: Artwork[]): ImageItem[] {
  // Filter artworks that have valid images
  const validArtworks = artworks
    .slice(0, CHUNK_SIZE)
    .filter((artwork) => Boolean(artwork.primaryImageSmall ?? artwork.primaryImage))
  
  // If we don't have enough valid artworks, duplicate some to fill the chunk
  const filledArtworks: Artwork[] = []
  for (let i = 0; i < CHUNK_SIZE; i++) {
    if (validArtworks.length > 0) {
      filledArtworks.push(validArtworks[i % validArtworks.length]!)
    } else {
      // If no valid artworks, we'll handle this below
      break
    }
  }
  
  return filledArtworks.map((artwork, i) => {
      const aspectRatio = generateAspectRatio(chunkX, chunkY, i)
      // For simple grid layout, use uniform dimensions based on our constants
      const width = COLUMN_WIDTH
      const height = COLUMN_WIDTH // Use square dimensions for uniform grid appearance

      // Use primaryImageSmall if available, fallback to primaryImage
      const imageUrl = artwork.primaryImageSmall ?? artwork.primaryImage
      const src = imageUrl!

      return {
        id: generateImageId('artwork', chunkX, chunkY, i, artwork.id),
        src,
        width,
        height,
        aspectRatio,
        chunkX,
        chunkY,
        localIndex: i,
        // Database fields - store both database ID and Met objectId
        databaseId: artwork.id, // Add explicit database ID field
        objectId: artwork.objectId ?? 0,
        title: artwork.title,
        artist: artwork.artist,
        date: artwork.date,
        department: artwork.department,
        culture: artwork.culture,
        medium: artwork.medium,
      }
    })
}

/**
 * Generate a single focal image from focal artwork data
 */
function generateFocalImage(chunkX: number, chunkY: number, focalArtwork: Artwork): ImageItem {
  const aspectRatio = generateAspectRatio(chunkX, chunkY, 0)
  // For focal image, use larger dimensions to make it prominent
  const width = CHUNK_WIDTH * 0.8 // Use 80% of chunk width
  const height = CHUNK_HEIGHT * 0.8 // Use 80% of chunk height

  // Use primaryImageSmall if available, fallback to primaryImage
  const imageUrl = focalArtwork.primaryImageSmall ?? focalArtwork.primaryImage
  const src = imageUrl!

  return {
    id: generateImageId('artwork', chunkX, chunkY, 0, focalArtwork.id),
    src,
    width,
    height,
    aspectRatio,
    chunkX,
    chunkY,
    localIndex: 0,
    // Database fields
    databaseId: focalArtwork.id,
    objectId: focalArtwork.objectId ?? 0,
    title: focalArtwork.title,
    artist: focalArtwork.artist,
    date: focalArtwork.date,
    department: focalArtwork.department,
    culture: focalArtwork.culture,
    medium: focalArtwork.medium,
  }
}

/**
 * Create a focal chunk with a single prominent image
 */
function createFocalChunk(
  chunkX: number, 
  chunkY: number, 
  chunkDataMap: Map<string, import('../grid-legacy/grid/types/grid').ChunkData>,
  onFocalArtworkPosition?: (position: { x: number; y: number; chunkX: number; chunkY: number }) => void
): SimilarityChunk | null {
  const chunkKey = `${chunkX},${chunkY}`
  const chunkData = chunkDataMap.get(chunkKey)
  
  // Only create chunk if we have artwork data
  if (!chunkData?.artworks || chunkData.artworks.length === 0) {
    return null
  }

  // For focal chunk, we only want the first artwork (should be the focal artwork)
  const focalArtwork = chunkData.artworks[0]
  if (!focalArtwork) {
    return null
  }

  // Create a single focal image
  const focalImage = generateFocalImage(chunkX, chunkY, focalArtwork)
  const images = [focalImage]

  if (DEBUG_LOGGING) {
    console.log(`🎯 Creating focal chunk ${chunkKey} with single image:`, focalImage.title)
  }

  // Calculate position for the focal image (centered in chunk)
  const chunkCenterX = CHUNK_WIDTH / 2
  const chunkCenterY = CHUNK_HEIGHT / 2
  const imageX = chunkCenterX - (focalImage.width / 2)
  const imageY = chunkCenterY - (focalImage.height / 2)

  const positions = [{
    x: imageX,
    y: imageY,
    width: focalImage.width,
    height: focalImage.height
  }]

  // Report focal artwork position for centering
  if (onFocalArtworkPosition) {
    const focalPosition = positions[0]
    if (focalPosition) {
      // Calculate absolute world position for the focal image
      const chunkWorldX = chunkX * CHUNK_WIDTH
      const chunkWorldY = chunkY * CHUNK_HEIGHT
      const worldX = chunkWorldX + focalPosition.x + (focalImage.width / 2) // Center of image
      const worldY = chunkWorldY + focalPosition.y + (focalImage.height / 2) // Center of image
      
      if (DEBUG_LOGGING) {
        console.log(`🎯 Focal chunk (${chunkX},${chunkY}) created with single focal image:`)
        console.log(`   Focal image local position:`, focalPosition)
        console.log(`   Chunk world position:`, { x: chunkWorldX, y: chunkWorldY })
        console.log(`   Focal image world center:`, { x: worldX, y: worldY })
        console.log(`   Focal image dimensions:`, { width: focalImage.width, height: focalImage.height })
      }
      
      onFocalArtworkPosition({
        x: worldX,
        y: worldY,
        chunkX,
        chunkY
      })
    }
  }

  return {
    id: `focal-chunk-${chunkX}-${chunkY}`,
    x: chunkX,
    y: chunkY,
    images,
    positions,
    bounds: calculateBoundingBox(positions, COLUMN_WIDTH),
    actualHeight: CHUNK_HEIGHT,
    isFocal: true // Add flag to identify focal chunks
  }
}

/**
 * Create a chunk as a discrete grid cell - Same as draggable grid
 */
function createChunk(
  chunkX: number, 
  chunkY: number, 
  chunkDataMap: Map<string, import('../grid-legacy/grid/types/grid').ChunkData>,
  onFocalArtworkPosition?: (position: { x: number; y: number; chunkX: number; chunkY: number }) => void
): Chunk | null {
  const chunkKey = `${chunkX},${chunkY}`
  const chunkData = chunkDataMap.get(chunkKey)
  
  // Only create chunk if we have artwork data
  if (!chunkData?.artworks || chunkData.artworks.length === 0) {
    return null
  }
  
  const images = generateChunkImagesFromArtworks(chunkX, chunkY, chunkData.artworks)
  
  if (images.length === 0) {
    return null
  }

  // Ensure React keys remain unique (IDs are already generated by utility functions)
  const finalImages = images.map((img) => ({
    ...img,
    chunkX,
    chunkY,
  }))

  // Use simple grid layout for compact 2x3 similarity grid
  const positions = calculateSimpleGridLayout(
    finalImages.map(img => ({ width: img.width, height: img.height })),
    chunkX,
    chunkY,
    COLUMNS_PER_CHUNK,
    ROWS_PER_CHUNK
  )

  // Report focal artwork position if this is the focal chunk (0,0)
  if (chunkX === 0 && chunkY === 0 && onFocalArtworkPosition && positions.length > 0) {
    const focalPosition = positions[0] // First image in focal chunk is the focal artwork
    const focalImage = finalImages[0]
    if (focalPosition && focalImage) {
      // Calculate absolute world position for the focal image
      const chunkWorldX = chunkX * CHUNK_WIDTH
      const chunkWorldY = chunkY * CHUNK_HEIGHT
      const worldX = chunkWorldX + focalPosition.x + (focalImage.width / 2) // Center of image
      const worldY = chunkWorldY + focalPosition.y + (focalImage.height / 2) // Center of image
      
      if (DEBUG_LOGGING) {
        console.log(`🎯 Focal chunk (${chunkX},${chunkY}) created:`)
        console.log(`   Chunk has ${positions.length} image positions`)
        console.log(`   Focal artwork local position:`, focalPosition)
        console.log(`   Chunk world position:`, { x: chunkWorldX, y: chunkWorldY })
        console.log(`   Focal artwork world center:`, { x: worldX, y: worldY })
        console.log(`   Focal artwork dimensions:`, { width: focalImage.width, height: focalImage.height })
      }
      
      onFocalArtworkPosition({
        x: worldX,
        y: worldY,
        chunkX,
        chunkY
      })
    }
  }

  return {
    id: `chunk-${chunkX}-${chunkY}`,
    x: chunkX,
    y: chunkY,
    images: finalImages,
    positions,
    bounds: calculateBoundingBox(positions, COLUMN_WIDTH),
    actualHeight: CHUNK_HEIGHT // Fixed grid cell height
  }
}

/**
 * Main simplified similarity chunk manager component with streaming support
 */
const SimilarityChunkManagerSimple = memo(function SimilarityChunkManagerSimple({
  viewport,
  isDragging,
  isInitialized,
  focalArtworkId,
  focalArtwork,
  onImageClick,
  onFocalArtworkPosition
}: SimilarityChunkManagerProps) {
  
  // Use simplified similarity data management hook with streaming support
  const { 
    chunkDataMap, 
    fetchChunkData,
    fetchMultipleChunksStreaming,
    fetchMultipleChunksWithDeduplication
  } = useSimilarityChunkDataSimple({
    focalArtworkId,
    focalArtwork
  })
  
  // Core chunk state - same as draggable grid
  const [chunks, setChunks] = React.useState<Map<string, SimilarityChunk>>(new Map())
  
  // Use virtualization hook - same as draggable grid
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

  // Performance tracking - same as draggable grid
  const loadingChunks = useRef<Set<string>>(new Set())
  
  // ============================================================================
  // SMART BATCHING LOGIC
  // ============================================================================
  
  /**
   * Group chunks into batches for efficient deduplication
   * Groups nearby chunks together to minimize duplicates
   * IMPORTANT: Excludes focal chunk (0,0) from batching
   */
  const groupChunksForBatching = useCallback((coords: ChunkCoordinates[]): ChunkCoordinates[][] => {
    if (coords.length === 0) return []
    
    // Filter out focal chunk (0,0) - it's handled separately
    const nonFocalCoords = coords.filter(coord => !(coord.x === 0 && coord.y === 0))
    
    if (nonFocalCoords.length === 0) return []
    
    // Sort by distance from origin for better grouping
    const sortedCoords = [...nonFocalCoords].sort((a, b) => {
      const distA = Math.hypot(a.x, a.y)
      const distB = Math.hypot(b.x, b.y)
      return distA - distB
    })
    
    const batches: ChunkCoordinates[][] = []
    const processed = new Set<string>()
    
    for (const coord of sortedCoords) {
      const key = `${coord.x},${coord.y}`
      if (processed.has(key)) continue
      
      const batch: ChunkCoordinates[] = [coord]
      processed.add(key)
      
      // Find nearby chunks to batch together (3x3 grouping)
      for (const other of sortedCoords) {
        if (batch.length >= 9) break // Increased batch size for better deduplication
        
        const otherKey = `${other.x},${other.y}`
        if (processed.has(otherKey)) continue
        
        // Check if chunks are adjacent (distance <= 1.5)
        const distance = Math.hypot(coord.x - other.x, coord.y - other.y)
        if (distance <= 1.5) {
          batch.push(other)
          processed.add(otherKey)
        }
      }
      
      batches.push(batch)
    }
    
    if (DEBUG_LOGGING) {
      console.log(`📦 Grouped ${nonFocalCoords.length} non-focal chunks into ${batches.length} batches:`, 
        batches.map(batch => `[${batch.map(c => `${c.x},${c.y}`).join(',')}]`).join(' '))
    }
    
    return batches
  }, [])
  
  // ============================================================================
  // CHUNK CREATION LOGIC
  // ============================================================================
  
  /**
   * Create chunks from coordinates (used by streaming effect)
   */
  const createChunksFromCoordinates = useCallback((coordinates: ChunkCoordinates[]) => {
    const newChunks: SimilarityChunk[] = []
    
    for (const coord of coordinates) {
      const chunkKey = `${coord.x},${coord.y}`
      
      if (!chunks.has(chunkKey)) {
        // Use focal chunk creation for coordinates (0,0), regular chunk creation for others
        const isFocalChunk = coord.x === 0 && coord.y === 0
        const newChunk = isFocalChunk 
          ? createFocalChunk(coord.x, coord.y, chunkDataMap, onFocalArtworkPosition)
          : createChunk(coord.x, coord.y, chunkDataMap, onFocalArtworkPosition)
          
        if (newChunk) {
          newChunks.push(newChunk)
          if (DEBUG_LOGGING) {
            console.log(`✅ Similarity ${isFocalChunk ? 'focal' : 'regular'} chunk ${chunkKey} created successfully`)
          }
        } else {
          // Remove from loading state if chunk creation failed
          loadingChunks.current.delete(chunkKey)
          if (DEBUG_LOGGING) {
            console.log(`⚠️ Similarity ${isFocalChunk ? 'focal' : 'regular'} chunk ${chunkKey} creation failed - removing from loading state`)
          }
        }
      }
    }
    
    // Update chunks state
    if (newChunks.length > 0) {
      setChunks(prev => {
        const updated = new Map(prev)
        newChunks.forEach(chunk => {
          const chunkKey = `${chunk.x},${chunk.y}`
          updated.set(chunkKey, chunk)
          loadingChunks.current.delete(chunkKey)
        })
        return updated
      })
    }
  }, [chunks, chunkDataMap, onFocalArtworkPosition])

  // Store in ref to avoid dependency issues
  const createChunksFromCoordinatesRef = useRef(createChunksFromCoordinates)
  createChunksFromCoordinatesRef.current = createChunksFromCoordinates
  
  // ============================================================================
  // CHUNK LOADING LOGIC - Updated for streaming
  // ============================================================================
  
  /**
   * Load chunks with smart batching and deduplication
   */
  const loadChunks = useCallback(async (coords: ChunkCoordinates[]) => {
    if (DEBUG_LOGGING) {
      console.log(`📦 SimilarityChunkManager: Loading ${coords.length} coordinates:`, coords.map(c => `(${c.x},${c.y})`).join(', '))
    }
    
    const chunksToFetch: ChunkCoordinates[] = []
    const chunksReadyForCreation: ChunkCoordinates[] = []
    
    // Separate focal chunk from others
    const focalChunks: ChunkCoordinates[] = []
    const regularChunks: ChunkCoordinates[] = []
    
    for (const coord of coords) {
      if (coord.x === 0 && coord.y === 0) {
        focalChunks.push(coord)
      } else {
        regularChunks.push(coord)
      }
    }
    
    // Process focal chunks first (should always create immediately)
    for (const coord of focalChunks) {
      const chunkKey = `${coord.x},${coord.y}`
      const chunkExists = chunks.has(chunkKey)
      
      if (!chunkExists) {
        if (DEBUG_LOGGING) {
          console.log(`🎯 Processing focal chunk ${chunkKey}`)
        }
        
        // Ensure focal chunk data exists - trigger fetch if needed
        const chunkData = chunkDataMap.get(chunkKey)
        if (!chunkData) {
          // Need to fetch focal data
          chunksToFetch.push(coord)
          loadingChunks.current.add(chunkKey)
        } else if (chunkData.artworks) {
          // Ready to create
          chunksReadyForCreation.push(coord)
        }
      }
    }
    
    // Process regular chunks
    for (const coord of regularChunks) {
      const chunkKey = `${coord.x},${coord.y}`
      const chunkData = chunkDataMap.get(chunkKey)
      const chunkExists = chunks.has(chunkKey)
      const chunkLoading = loadingChunks.current.has(chunkKey)
      
      if (!chunkExists && !chunkLoading) {
        // Mark as loading to show skeleton
        loadingChunks.current.add(chunkKey)
        
        if (!chunkData || (!chunkData.artworks && !chunkData.loading)) {
          // Need to fetch data
          chunksToFetch.push(coord)
          if (DEBUG_LOGGING) {
            console.log(`🔄 Similarity chunk ${chunkKey} needs data fetch (showing skeleton)`)
          }
        } else if (chunkData.artworks) {
          // Data is ready, create chunk immediately
          chunksReadyForCreation.push(coord)
          if (DEBUG_LOGGING) {
            console.log(`🏗️ Similarity chunk ${chunkKey} ready for creation`)
          }
        }
      }
    }
    
    // Create chunks that have data ready
    if (chunksReadyForCreation.length > 0) {
      createChunksFromCoordinatesRef.current(chunksReadyForCreation)
    }
    
    // Fetch chunks using smart batching with deduplication
    if (chunksToFetch.length > 0) {
      if (DEBUG_LOGGING) {
        console.log(`🚀 Starting smart batching for ${chunksToFetch.length} chunks`)
      }
      
      // Separate focal chunks from regular chunks for different handling
      const focalChunksToFetch = chunksToFetch.filter(coord => coord.x === 0 && coord.y === 0)
      const regularChunksToFetch = chunksToFetch.filter(coord => !(coord.x === 0 && coord.y === 0))
      
      // Handle focal chunks first with individual API calls (they contain target artwork)
      for (const focalChunk of focalChunksToFetch) {
        if (DEBUG_LOGGING) {
          console.log(`🎯 Fetching focal chunk ${focalChunk.x},${focalChunk.y} individually`)
        }
        await fetchMultipleChunksStreaming([focalChunk], 'high')
      }
      
      // Group regular chunks into batches for deduplication
      if (regularChunksToFetch.length > 0) {
        const batches = groupChunksForBatching(regularChunksToFetch)
        
        // Process batches with deduplication, single chunks with streaming
        for (const batch of batches) {
          if (batch.length > 1) {
            // Use deduplication API for multi-chunk batches
            await fetchMultipleChunksWithDeduplication(batch)
          } else {
            // Use streaming API for single chunks (fire and forget)
            await fetchMultipleChunksStreaming(batch, 'high')
          }
        }
      }
    }
  }, [chunks, chunkDataMap, fetchMultipleChunksStreaming, fetchMultipleChunksWithDeduplication, groupChunksForBatching])
  
  // Store loadChunks in a ref to avoid dependency issues
  const loadChunksRef = useRef(loadChunks)
  loadChunksRef.current = loadChunks

  // ============================================================================
  // EFFECTS - Including streaming effect
  // ============================================================================
  
  /**
   * Load chunks when chunksToLoad changes
   */
  useEffect(() => {
    if (chunksToLoad.length > 0) {
      void loadChunksRef.current(chunksToLoad)
    }
  }, [chunksToLoad])

  /**
   * STREAMING: Create chunks immediately when their data becomes available
   * This is the key to streaming performance - chunks render as soon as data arrives
   */
  useEffect(() => {
    const chunksReadyForCreation: ChunkCoordinates[] = []
    
    // Check all loading chunks to see if their data has arrived
    for (const chunkKey of loadingChunks.current) {
      const [xStr, yStr] = chunkKey.split(',')
      const x = parseInt(xStr!, 10)
      const y = parseInt(yStr!, 10)
      
      const chunkData = chunkDataMap.get(chunkKey)
      const chunkExists = chunks.has(chunkKey)
      
      // If data is ready and chunk doesn't exist yet, create it immediately
      if (chunkData?.artworks && !chunkExists && !chunkData.loading) {
        chunksReadyForCreation.push({ x, y })
        if (DEBUG_LOGGING) {
          console.log(`🎯 STREAMING: Chunk ${chunkKey} data arrived, creating immediately`)
        }
      }
    }
    
    // Create chunks that just got their data
    if (chunksReadyForCreation.length > 0) {
      createChunksFromCoordinatesRef.current(chunksReadyForCreation)
    }
  }, [chunkDataMap, chunks])

  /**
   * Store updateVirtualization in ref to avoid dependency cycles
   */
  const updateVirtualizationRef = useRef(updateVirtualization)
  updateVirtualizationRef.current = updateVirtualization

  /**
   * Initial virtualization trigger when initialized
   */
  useEffect(() => {
    if (isInitialized && !isDragging) {
      if (DEBUG_LOGGING) {
        console.log('🚀 SimilarityChunkManager: Initial virtualization trigger')
      }
      updateVirtualizationRef.current()
    }
  }, [isInitialized, isDragging])

  /**
   * Handle window resize and clear chunks
   */
  useEffect(() => {
    const handleResize = () => {
      // Clear layout state on resize but DON'T reset translate position
      setChunks(new Map())
      loadingChunks.current.clear()
    }
    
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // ============================================================================
  // RENDER - Same as draggable grid
  // ============================================================================
  
  // Calculate current translation position for rendering
  const translate: Position = {
    x: viewport.translateX,
    y: viewport.translateY
  }

  if (DEBUG_LOGGING) {
    console.log(`🎛️ SimilarityChunkManager: Rendering ${chunks.size} chunks, ${visibleChunks.length} visible, ${chunksToLoad.length} to load`)
  }

  return (
    <SimilarityGridRenderer
      chunks={chunks}
      translate={translate}
      isDragging={isDragging}
      onImageClick={onImageClick}
      loadingChunks={loadingChunks.current}
      chunksToLoad={chunksToLoad}
      visibleChunks={visibleChunks.length}
      chunkDataMap={chunkDataMap}
      focalArtwork={focalArtwork}
    />
  )
})

// Add display name for better debugging
SimilarityChunkManagerSimple.displayName = 'SimilarityChunkManagerSimple'

export default SimilarityChunkManagerSimple