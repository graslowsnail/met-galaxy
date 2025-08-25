/**
 * Simplified SimilarityChunkManager - Based on draggable grid's ChunkManager
 * 
 * This is a simplified version that copies the architecture of the working
 * draggable grid but adapts it for the similarity grid. No complex similarity
 * zones or ring logic - just straightforward chunk management like the draggable grid.
 */

import React, { memo, useCallback, useEffect, useRef } from 'react'
import { useSimilarityChunkDataSimple } from './hooks/useSimilarityChunkDataSimple'
import { useVirtualization } from '../../grid-legacy/grid/hooks/useVirtualization'
import GridRenderer from '../../grid-legacy/grid/GridRenderer'
import type { 
  Chunk, 
  ChunkCoordinates, 
  ImageItem, 
  Position,
  ViewportState
} from '../../grid-legacy/grid/types/grid'
import {
  generateImageId,
  generateAspectRatio,
  calculateImageDimensions,
  calculateBoundingBox,
  calculateOptimalChunkLayout,
} from '../../grid-legacy/grid/utils/chunkCalculations'
import { 
  COLUMN_WIDTH,
  CHUNK_SIZE,
  CHUNK_HEIGHT,
  DEBUG_LOGGING
} from '../../utils/constants'
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
    imageUrl: string | null
    originalImageUrl: string | null
  }
  /** Callback when an image is clicked */
  onImageClick?: (image: ImageItem, event: React.MouseEvent) => void
  /** Whether to show performance overlay */
  showPerformanceOverlay?: boolean
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
      const { width, height } = calculateImageDimensions(aspectRatio)

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
 * Create a chunk as a discrete grid cell - Same as draggable grid
 */
function createChunk(
  chunkX: number, 
  chunkY: number, 
  chunkDataMap: Map<string, import('../../grid-legacy/grid/types/grid').ChunkData>,
  fetchResults?: Map<string, Artwork[]>
): Chunk {
  const chunkKey = `${chunkX},${chunkY}`
  const chunkData = chunkDataMap.get(chunkKey)
  
  // Get artwork data for this chunk
  let images: ImageItem[] = []
  let artworks: Artwork[] | undefined = undefined
  
  // Try to get artworks from state first, then fallback to fetch results
  if (chunkData?.artworks && chunkData.artworks.length > 0) {
    artworks = chunkData.artworks
  } else if (fetchResults?.has(chunkKey)) {
    artworks = fetchResults.get(chunkKey)
  }
  
  if (DEBUG_LOGGING) {
    console.log(`Creating similarity chunk ${chunkX},${chunkY}:`, {
      hasChunkData: Boolean(chunkData?.artworks),
      artworkCount: chunkData?.artworks?.length ?? 0,
      hasFetchResults: Boolean(fetchResults?.has(chunkKey)),
      fetchResultsCount: fetchResults?.get(chunkKey)?.length ?? 0,
      finalArtworkCount: artworks?.length ?? 0,
      loading: chunkData?.loading ?? false,
      error: chunkData?.error
    })
  }
  
  if (artworks && artworks.length > 0) {
    if (DEBUG_LOGGING) {
      console.log(`Similarity chunk ${chunkX},${chunkY} - using ${artworks.length} artworks`)
    }
    images = generateChunkImagesFromArtworks(chunkX, chunkY, artworks)
    if (DEBUG_LOGGING) {
      console.log(`Similarity chunk ${chunkX},${chunkY} - generated ${images.length} images`)
    }
  }

  // Ensure React keys remain unique (IDs are already generated by utility functions)
  images = images.map((img) => ({
    ...img,
    chunkX,
    chunkY,
  }))

  // Use optimized layout calculation for better space utilization
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
    actualHeight: CHUNK_HEIGHT // Fixed grid cell height
  }
}

/**
 * Main simplified similarity chunk manager component
 */
const SimilarityChunkManagerSimple = memo(function SimilarityChunkManagerSimple({
  viewport,
  isDragging,
  isInitialized,
  focalArtworkId,
  focalArtwork,
  onImageClick,
  showPerformanceOverlay = true
}: SimilarityChunkManagerProps) {
  
  // Use simplified similarity data management hook
  const { chunkDataMap, fetchChunkData } = useSimilarityChunkDataSimple({
    focalArtworkId,
    focalArtwork
  })
  
  // Core chunk state - same as draggable grid
  const [chunks, setChunks] = React.useState<Map<string, Chunk>>(new Map())
  
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
  // CHUNK LOADING LOGIC - Same as draggable grid
  // ============================================================================
  
  /**
   * Load chunks efficiently with async batching - Same as draggable grid
   */
  const loadChunks = useCallback(async (coords: ChunkCoordinates[]) => {
    if (DEBUG_LOGGING) {
      console.log(`📦 SimilarityChunkManager: Loading ${coords.length} coordinates:`, coords.map(c => `(${c.x},${c.y})`).join(', '))
    }
    
    const chunksToFetch: ChunkCoordinates[] = []
    const chunksToCreate: ChunkCoordinates[] = []
    
    // Separate chunks that need data fetching vs chunk creation
    for (const coord of coords) {
      const chunkKey = `${coord.x},${coord.y}`
      const chunkData = chunkDataMap.get(chunkKey)
      const chunkExists = chunks.has(chunkKey)
      const chunkLoading = loadingChunks.current.has(chunkKey)
      
      if (!chunkExists && !chunkLoading) {
        // Always mark as loading first to show skeleton
        loadingChunks.current.add(chunkKey)
        
        if (!chunkData || (!chunkData.artworks && !chunkData.loading)) {
          // Need to fetch data first
          chunksToFetch.push(coord)
          if (DEBUG_LOGGING) {
            console.log(`🔄 Similarity chunk ${chunkKey} needs data fetch (showing skeleton)`)
          }
        } else if (chunkData.artworks) {
          // Data is ready, can create chunk
          chunksToCreate.push(coord)
          if (DEBUG_LOGGING) {
            console.log(`🏗️ Similarity chunk ${chunkKey} ready for creation (showing skeleton)`)
          }
        }
      } else if (DEBUG_LOGGING) {
        console.log(`⏭️ Similarity chunk ${chunkKey} skipped - exists: ${chunkExists}, loading: ${chunkLoading}`)
      }
    }
    
    // Fetch data for chunks SEQUENTIALLY to ensure proper deduplication
    const fetchResults = new Map<string, Artwork[]>()
    if (chunksToFetch.length > 0) {
      if (DEBUG_LOGGING) {
        console.log(`🔄 Fetching ${chunksToFetch.length} chunks SEQUENTIALLY to prevent duplicates`)
      }
      
      // Process chunks one by one so each gets updated exclude list
      for (const coord of chunksToFetch) {
        try {
          const artworks = await fetchChunkData(coord.x, coord.y)
          if (artworks) {
            fetchResults.set(`${coord.x},${coord.y}`, artworks)
            if (DEBUG_LOGGING) {
              console.log(`📦 Stored ${artworks.length} artworks for similarity chunk ${coord.x},${coord.y} in fetchResults`)
            }
          } else {
            if (DEBUG_LOGGING) {
              console.log(`⚠️ No artworks returned for similarity chunk ${coord.x},${coord.y}`)
            }
          }
        } catch (error) {
          console.error(`❌ Error fetching chunk ${coord.x},${coord.y}:`, error)
        }
      }
      
      // After fetching, these chunks can now be created
      chunksToCreate.push(...chunksToFetch)
    }
    
    // Create chunks that have data ready
    const newChunks: Chunk[] = []
    for (const coord of chunksToCreate) {
      const chunkKey = `${coord.x},${coord.y}`
      
      if (!chunks.has(chunkKey)) {
        try {
          const newChunk = createChunk(coord.x, coord.y, chunkDataMap, fetchResults)
          if (newChunk && newChunk.positions.length > 0) {
            newChunks.push(newChunk)
            // Only remove loading state when chunk is successfully created
            if (DEBUG_LOGGING) {
              console.log(`✅ Similarity chunk ${chunkKey} created successfully`)
            }
          } else {
            if (DEBUG_LOGGING) {
              console.log(`⚠️ Similarity chunk ${chunkKey} created but empty - removing from loading state`)
            }
            // Remove from loading state even if empty to prevent infinite loading
            loadingChunks.current.delete(chunkKey)
          }
        } catch (error) {
          console.error(`❌ Error creating similarity chunk ${coord.x},${coord.y}:`, error)
          // Keep loading state on error so user knows something went wrong
        }
      }
    }
    
    // Update chunks state and remove loading states for successful chunks
    if (newChunks.length > 0) {
      setChunks(prev => {
        const updated = new Map(prev)
        newChunks.forEach(chunk => {
          const chunkKey = `${chunk.x},${chunk.y}`
          updated.set(chunkKey, chunk)
          // Remove loading state only when chunk is actually in the map
          loadingChunks.current.delete(chunkKey)
        })
        return updated
      })
    }
  }, [chunks, chunkDataMap, fetchChunkData])
  
  // Store loadChunks in a ref to avoid dependency issues
  const loadChunksRef = useRef(loadChunks)
  loadChunksRef.current = loadChunks

  // ============================================================================
  // EFFECTS - Same as draggable grid
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
    <GridRenderer
      chunks={chunks}
      translate={translate}
      isDragging={isDragging}
      onImageClick={onImageClick}
      loadingChunks={loadingChunks.current}
      chunksToLoad={chunksToLoad}
      visibleChunks={visibleChunks.length}
      chunkDataMap={chunkDataMap}
      showPerformanceOverlay={showPerformanceOverlay}
    />
  )
})

// Add display name for better debugging
SimilarityChunkManagerSimple.displayName = 'SimilarityChunkManagerSimple'

export default SimilarityChunkManagerSimple