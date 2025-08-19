"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { SimilarityGrid } from "./similarity-grid"
import { apiClient } from "@/lib/api-client"
import type { Artwork } from "@/types/api"

interface ImageItem {
  id: string
  src: string
  width: number
  height: number
  aspectRatio: number
  chunkX: number
  chunkY: number
  localIndex: number // Index within the chunk
  // Database fields
  databaseId?: number // The actual database ID used for similarity API
  objectId?: number // Met Museum's object ID
  title?: string | null
  artist?: string | null
  date?: string | null
  department?: string | null
  culture?: string | null
  medium?: string | null
}

interface Chunk {
  id: string
  x: number
  y: number
  images: ImageItem[]
  positions: Array<{ x: number; y: number; height: number }>
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
  actualHeight: number // The real height this chunk occupies
}

// Constants for grid-based layout
const COLUMN_WIDTH = 280
const GAP = 16
const CHUNK_SIZE = 20 // Images per chunk
const COLUMNS_PER_CHUNK = 4
const AXIS_MARGIN = 15 // Space around the axis lines
const CHUNK_WIDTH = COLUMNS_PER_CHUNK * (COLUMN_WIDTH + GAP) + (2 * AXIS_MARGIN) // Width includes margins
const CHUNK_HEIGHT = 1600 // Height of each grid cell
const VIEWPORT_BUFFER = 50 // Very small buffer to minimize chunks
const MAX_RENDERED_CHUNKS = 12 // Maximum chunks to render (keep this small!)
const MAX_DATA_CACHE = 100 // Maximum chunk data to cache (can be larger)
// const HORIZONTAL_TILE_CHUNKS = 2 // Repeat content every N horizontal chunks

// Grid origin - chunks are positioned relative to this center point
const GRID_ORIGIN_X = 0
const GRID_ORIGIN_Y = 0

// Store artwork data for chunks (unused for now)
// const artworkCache = new Map<string, Artwork[]>()

// Generate image items from artwork data
const generateChunkImagesFromArtworks = (chunkX: number, chunkY: number, artworks: Artwork[]): ImageItem[] => {
  const defaultAspectRatios = [0.7, 0.8, 1.0, 1.2, 1.4, 0.6, 1.6]
  
  return artworks
    .slice(0, CHUNK_SIZE)
    .filter((artwork) => Boolean(artwork.primaryImageSmall ?? artwork.primaryImage)) // Only include artworks with images
    .map((artwork, i) => {
      const seed = Math.abs(chunkX * 1000 + chunkY * 100 + i)
      const fallbackAspectRatio = defaultAspectRatios[seed % defaultAspectRatios.length]!
      const aspectRatio = fallbackAspectRatio // We'll calculate from image dimensions later
      const width = COLUMN_WIDTH
      const height = Math.max(100, Math.round(width / aspectRatio))

      // Use primaryImageSmall if available, fallback to primaryImage
      const imageUrl = artwork.primaryImageSmall ?? artwork.primaryImage
      const src = imageUrl!

      return {
        id: `artwork-${artwork.id}-${chunkX}-${chunkY}-${i}`, // Use database ID instead of objectId
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

// Fallback function for when no artworks are available
const generatePlaceholderImages = (chunkX: number, chunkY: number): ImageItem[] => {
  const aspectRatios = [0.7, 0.8, 1.0, 1.2, 1.4, 0.6, 1.6]
  
  return Array.from({ length: CHUNK_SIZE }, (_, i) => {
    const seed = Math.abs(chunkX * 1000 + chunkY * 100 + i)
    const aspectRatio = aspectRatios[seed % aspectRatios.length]!
    const width = COLUMN_WIDTH
    const height = Math.max(100, Math.round(width / aspectRatio))

    return {
      id: `placeholder-${chunkX}-${chunkY}-${i}`,
      src: `https://picsum.photos/seed/${seed}/${width}/${height}`,
      width,
      height,
      aspectRatio,
      chunkX,
      chunkY,
      localIndex: i,
    }
  })
}

export function DraggableImageGrid() {
  // Core state
  const [chunks, setChunks] = useState<Map<string, Chunk>>(new Map())
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 })
  
  // Similarity view state
  const [selectedArtworkId, setSelectedArtworkId] = useState<number | null>(null)
  const [showSimilarity, setShowSimilarity] = useState(false)
  
  // Initialization flag to prevent excessive updates during startup
  const [isInitialized, setIsInitialized] = useState(false)

  // Chunk data management - each chunk fetches its own data
  const [chunkDataMap, setChunkDataMap] = useState<Map<string, { 
    artworks: Artwork[] | null, 
    loading: boolean, 
    error: Error | null 
  }>>(new Map())

  // Track which chunks are currently being fetched to prevent duplicates
  const fetchingChunks = useRef<Set<string>>(new Set())

  // Fetch artwork data for a specific chunk
  const fetchChunkData = useCallback(async (chunkX: number, chunkY: number) => {
    const chunkKey = `${chunkX},${chunkY}`
    
    // Skip if already loading or loaded
    const existingData = chunkDataMap.get(chunkKey)
    if (existingData && (existingData.loading || existingData.artworks)) {
      console.log(`Chunk ${chunkKey} already has data, skipping fetch`)
      return existingData.artworks
    }

    // Skip if already being fetched
    if (fetchingChunks.current.has(chunkKey)) {
      console.log(`Chunk ${chunkKey} already being fetched, skipping duplicate`)
      return null
    }

    // Mark as being fetched
    fetchingChunks.current.add(chunkKey)

    // Set loading state
    setChunkDataMap(prev => new Map(prev).set(chunkKey, {
      artworks: null,
      loading: true,
      error: null
    }))

    try {
      console.log(`🔍 Fetching data for chunk ${chunkX},${chunkY}`)
      const response = await apiClient.getChunkArtworks({ 
        chunkX, 
        chunkY, 
        count: CHUNK_SIZE 
      })
      
      // Update with successful data
      setChunkDataMap(prev => new Map(prev).set(chunkKey, {
        artworks: response.artworks,
        loading: false,
        error: null
      }))
      
      console.log(`✅ Loaded ${response.artworks.length} artworks for chunk ${chunkX},${chunkY}`)
      return response.artworks
      
    } catch (error) {
      console.error(`❌ Error fetching chunk ${chunkX},${chunkY}:`, error)
      
      // Update with error state
      setChunkDataMap(prev => new Map(prev).set(chunkKey, {
        artworks: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch chunk data')
      }))
      
      return null
    } finally {
      // Remove from fetching set
      fetchingChunks.current.delete(chunkKey)
    }
  }, [chunkDataMap])

  // Performance tracking
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const lastViewport = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const rafId = useRef<number | undefined>(undefined)
  const loadingChunks = useRef<Set<string>>(new Set())
  
  // Track loaded chunks for grid-based layout
  const loadedChunks = useRef<Set<string>>(new Set())

  // Update viewport dimensions on mount and resize
  const updateViewportDimensions = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth
      const containerHeight = containerRef.current.clientHeight
      setViewportDimensions({ width: containerWidth, height: containerHeight })
    }
  }, [])

  // Initialize column heights for independent chunk layout
  const initializeChunkColumnHeights = useCallback((): number[] => {
    // Start with AXIS_MARGIN offset since that's where images begin
    return new Array(COLUMNS_PER_CHUNK).fill(AXIS_MARGIN)
  }, [])

  // Create a chunk as a discrete grid cell
  const createChunk = useCallback((chunkX: number, chunkY: number): Chunk => {
    const chunkKey = `${chunkX},${chunkY}`
    const chunkData = chunkDataMap.get(chunkKey)
    
    // Get artwork data for this chunk
    let images: ImageItem[] = []
    
    console.log(`Creating chunk ${chunkX},${chunkY}:`, {
      hasChunkData: Boolean(chunkData?.artworks),
      artworkCount: chunkData?.artworks?.length ?? 0,
      loading: chunkData?.loading ?? false,
      error: chunkData?.error
    })
    
    if (chunkData?.artworks && chunkData.artworks.length > 0) {
      console.log(`Chunk ${chunkX},${chunkY} - using ${chunkData.artworks.length} artworks`)
      images = generateChunkImagesFromArtworks(chunkX, chunkY, chunkData.artworks)
      console.log(`Chunk ${chunkX},${chunkY} - generated ${images.length} images`)
    }
    
    // Disable placeholders - only show real artwork images
    // if (images.length === 0) {
    //   images = generatePlaceholderImages(chunkX, chunkY)
    // }

    // Ensure React keys remain unique
    images = images.map((img, i) => ({
      ...img,
      id: `${img.objectId ? 'artwork' : 'placeholder'}-${chunkX}-${chunkY}-${i}`,
      chunkX,
      chunkY,
    }))

    // Independent masonry layout within this grid cell
    const columnHeights = initializeChunkColumnHeights()
    const positions: Array<{ x: number; y: number; height: number }> = []

    // Grid-based positioning - each chunk is a discrete cell
    const baseX = GRID_ORIGIN_X + (chunkX * CHUNK_WIDTH)
    const baseY = GRID_ORIGIN_Y + (chunkY * CHUNK_HEIGHT)

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

    images.forEach((image, _imageIndex) => {
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
      
      // Calculate position with different logic for negative X chunks
      let localX: number, localY: number
      
      if (chunkX < 0) {
        // For negative X chunks, position from right edge to create space toward Y-axis
        localX = CHUNK_WIDTH - AXIS_MARGIN - (shortestColumnIndex + 1) * (COLUMN_WIDTH + GAP)
        localY = columnHeights[shortestColumnIndex]!
      } else {
        // For positive X chunks, position from left edge
        localX = AXIS_MARGIN + shortestColumnIndex * (COLUMN_WIDTH + GAP)
        localY = columnHeights[shortestColumnIndex]!
      }
      
      // Final position
      const x = baseX + localX
      const y = baseY + localY
      


      // Ensure image doesn't exceed chunk boundaries (with margin on all sides)
      const chunkMaxY = baseY + CHUNK_HEIGHT - AXIS_MARGIN
      const chunkMaxX = baseX + CHUNK_WIDTH - AXIS_MARGIN
      const availableHeight = chunkMaxY - y
      const availableWidth = chunkMaxX - x
      
      // Skip this image if there's no room in this chunk
      if (availableHeight < 100 || availableWidth < COLUMN_WIDTH) { // Minimum thresholds
        return
      }
      
      // Constrain image height to fit within chunk
      const constrainedHeight = Math.min(image.height, availableHeight)
      
      // Validate height to prevent NaN values
      if (!constrainedHeight || constrainedHeight <= 0 || !isFinite(constrainedHeight) || isNaN(constrainedHeight)) {
        console.warn(`Invalid height for image ${image.id}:`, {
          originalHeight: image.height,
          availableHeight,
          constrainedHeight,
          chunkX,
          chunkY
        })
        return
      }

      positions.push({ x, y, height: constrainedHeight })
      
      // Update column heights - always building downward within each chunk
      const oldHeight = columnHeights[shortestColumnIndex]!
      columnHeights[shortestColumnIndex] = oldHeight + constrainedHeight + GAP
      


      // Update bounds
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x + COLUMN_WIDTH)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y + constrainedHeight)
    })

    return {
      id: `chunk-${chunkX}-${chunkY}`,
      x: chunkX,
      y: chunkY,
      images,
      positions,
      bounds: { minX, maxX, minY, maxY },
      actualHeight: CHUNK_HEIGHT // Fixed grid cell height
    }
  }, [chunkDataMap, initializeChunkColumnHeights])

  // Get visible chunk coordinates for quadrant-based grid (strict viewport only)
  const getVisibleChunkCoords = useCallback(() => {
    const viewLeft = -translate.x - VIEWPORT_BUFFER
    const viewRight = -translate.x + viewportDimensions.width + VIEWPORT_BUFFER
    const viewTop = -translate.y - VIEWPORT_BUFFER
    const viewBottom = -translate.y + viewportDimensions.height + VIEWPORT_BUFFER
    
    // Calculate grid coordinates (supporting negative values for quadrants)
    const startChunkX = Math.floor((viewLeft - GRID_ORIGIN_X) / CHUNK_WIDTH)
    const endChunkX = Math.ceil((viewRight - GRID_ORIGIN_X) / CHUNK_WIDTH)
    const startChunkY = Math.floor((viewTop - GRID_ORIGIN_Y) / CHUNK_HEIGHT)
    const endChunkY = Math.ceil((viewBottom - GRID_ORIGIN_Y) / CHUNK_HEIGHT)
    
    const coords: Array<{ x: number; y: number }> = []
    for (let x = startChunkX; x <= endChunkX; x++) {
      for (let y = startChunkY; y <= endChunkY; y++) {
        coords.push({ x, y })
      }
    }
    
    console.log(`🔍 VIEWPORT CALCULATION:`)
    console.log(`  Translate: (${translate.x}, ${translate.y})`)
    console.log(`  Viewport: ${viewportDimensions.width}x${viewportDimensions.height}`)
    console.log(`  View bounds: L=${viewLeft} R=${viewRight} T=${viewTop} B=${viewBottom}`)
    console.log(`  Chunk bounds: X=${startChunkX} to ${endChunkX}, Y=${startChunkY} to ${endChunkY}`)
    console.log(`  Total chunks: ${(endChunkX - startChunkX + 1)} × ${(endChunkY - startChunkY + 1)} = ${coords.length}`)
    console.log(`  Chunks:`, coords.map(c => `(${c.x},${c.y})`).join(', '))
    
    return coords
  }, [translate, viewportDimensions])

  // Get chunks that are actually visible (no buffer, strict viewport)
  const getStrictlyVisibleChunkCoords = useCallback(() => {
    const viewLeft = -translate.x
    const viewRight = -translate.x + viewportDimensions.width
    const viewTop = -translate.y
    const viewBottom = -translate.y + viewportDimensions.height
    
    // Calculate grid coordinates (supporting negative values for quadrants)
    const startChunkX = Math.floor((viewLeft - GRID_ORIGIN_X) / CHUNK_WIDTH)
    const endChunkX = Math.ceil((viewRight - GRID_ORIGIN_X) / CHUNK_WIDTH)
    const startChunkY = Math.floor((viewTop - GRID_ORIGIN_Y) / CHUNK_HEIGHT)
    const endChunkY = Math.ceil((viewBottom - GRID_ORIGIN_Y) / CHUNK_HEIGHT)
    
    const coords: Array<{ x: number; y: number }> = []
    for (let x = startChunkX; x <= endChunkX; x++) {
      for (let y = startChunkY; y <= endChunkY; y++) {
        coords.push({ x, y })
      }
    }
    
    return coords
  }, [translate, viewportDimensions])

  // Aggressive cleanup for true virtualization - immediately drop chunks outside viewport
  const cleanupDistantChunks = useCallback(() => {
    const visibleCoords = getVisibleChunkCoords()
    const visibleSet = new Set(visibleCoords.map(coord => `${coord.x},${coord.y}`))
    
    setChunks(prevChunks => {
      const newChunks = new Map(prevChunks)
      let removedCount = 0
      
      // Immediately remove ALL chunks that are not in viewport (aggressive virtualization)
      for (const [chunkKey] of newChunks) {
        if (!visibleSet.has(chunkKey)) {
          newChunks.delete(chunkKey)
          removedCount++
        }
      }
      
      if (removedCount > 0) {
        console.log(`🧹 Virtualization cleanup: removed ${removedCount} chunks, keeping ${newChunks.size}`)
      }
      
      return newChunks
    })
    
    // Clean up data cache more conservatively (keep data longer than rendered chunks)
    cleanupDataCache()
  }, [getVisibleChunkCoords])

  // Separate data cache cleanup with LRU strategy
  const cleanupDataCache = useCallback(() => {
    setChunkDataMap(prevData => {
      if (prevData.size <= MAX_DATA_CACHE) return prevData
      
      const newData = new Map(prevData)
      const dataKeys = Array.from(newData.keys())
      const excessCount = newData.size - MAX_DATA_CACHE
      
      // Remove oldest entries (LRU - assuming Map maintains insertion order)
      const keysToRemove = dataKeys.slice(0, excessCount)
      keysToRemove.forEach(key => newData.delete(key))
      
      console.log(`💾 Data cache cleanup: removed ${keysToRemove.length} entries, keeping ${newData.size}`)
      return newData
    })
  }, [])

  // Load chunks efficiently with async batching
  const loadChunks = useCallback(async (coords: Array<{ x: number; y: number }>) => {
    console.log(`📦 loadChunks called with ${coords.length} coordinates:`, coords.map(c => `(${c.x},${c.y})`).join(', '))
    
    const chunksToFetch: Array<{ x: number; y: number }> = []
    const chunksToCreate: Array<{ x: number; y: number }> = []
    
    // Separate chunks that need data fetching vs chunk creation
    for (const coord of coords) {
      const chunkKey = `${coord.x},${coord.y}`
      const chunkData = chunkDataMap.get(chunkKey)
      const chunkExists = chunks.has(chunkKey)
      const chunkLoading = loadingChunks.current.has(chunkKey)
      
      if (!chunkExists && !chunkLoading) {
        if (!chunkData || (!chunkData.artworks && !chunkData.loading)) {
          // Need to fetch data first
          chunksToFetch.push(coord)
          console.log(`🔄 Chunk ${chunkKey} needs data fetch`)
        } else if (chunkData.artworks) {
          // Data is ready, can create chunk
          chunksToCreate.push(coord)
          console.log(`🏗️ Chunk ${chunkKey} ready for creation`)
        }
      } else {
        console.log(`⏭️ Chunk ${chunkKey} skipped - exists: ${chunkExists}, loading: ${chunkLoading}`)
      }
    }
    
    // Fetch data for chunks that need it
    if (chunksToFetch.length > 0) {
      setLoading(true)
      await Promise.all(
        chunksToFetch.map(coord => fetchChunkData(coord.x, coord.y))
      )
      setLoading(false)
      
      // After fetching, these chunks can now be created
      chunksToCreate.push(...chunksToFetch)
    }
    
    // Create chunks that have data ready
    const newChunks: Array<Chunk> = []
    for (const coord of chunksToCreate) {
      const chunkKey = `${coord.x},${coord.y}`
      
      if (!chunks.has(chunkKey) && !loadingChunks.current.has(chunkKey)) {
        loadingChunks.current.add(chunkKey)
        try {
          const newChunk = createChunk(coord.x, coord.y)
          if (newChunk && newChunk.positions.length > 0) {
            newChunks.push(newChunk)
          }
        } catch (error) {
          console.error(`Error creating chunk ${coord.x},${coord.y}:`, error)
        }
        loadingChunks.current.delete(chunkKey)
      }
    }
    
    // Update chunks state
    if (newChunks.length > 0) {
      setChunks(prev => {
        const updated = new Map(prev)
        newChunks.forEach(chunk => {
          updated.set(`${chunk.x},${chunk.y}`, chunk)
        })
        return updated
      })
    }
    
    return Promise.resolve() // Return a promise for initialization to wait on
  }, [chunks, createChunk, chunkDataMap, fetchChunkData])

  // Initialize with minimal chunks at startup
  useEffect(() => {
    // Only run once when viewport dimensions are first available and not already initialized
    if (
      viewportDimensions.width && 
      viewportDimensions.height && 
      !isInitialized
    ) {
      console.log('🚀 Initializing grid - starting at center')
      
      // Calculate center position
      const centerX = viewportDimensions.width / 2
      const centerY = viewportDimensions.height / 2
      
      // Set initial translate to center (0,0) chunk in viewport
      setTranslate({ x: centerX, y: centerY })
      
      // Mark as initialized immediately to prevent race conditions
      setIsInitialized(true)
      
      // Let the normal viewport logic handle loading chunks
      console.log('✅ Initialization complete - viewport will handle chunk loading')
    }
  }, [viewportDimensions, isInitialized])

  // Handle window resize and recalculate viewport
  useEffect(() => {
    updateViewportDimensions()
    const handleResize = () => {
      updateViewportDimensions()
      // Clear layout state on resize but DON'T reset translate position
      setChunks(new Map())
      loadedChunks.current.clear()
    }
    
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateViewportDimensions])

  // Optimized viewport-based chunk loading with RAF
  const updateVisibleChunks = useCallback(() => {
    // Don't update chunks until we're properly initialized
    if (!viewportDimensions.width || !viewportDimensions.height || !isInitialized) return
    
    const currentViewport = {
      x: -translate.x,
      y: -translate.y,
      width: viewportDimensions.width,
      height: viewportDimensions.height
    }
    
    // For true virtualization, update more frequently (smaller threshold)
    const threshold = 50 // Smaller threshold for more responsive virtualization
    if (
      Math.abs(currentViewport.x - lastViewport.current.x) < threshold &&
      Math.abs(currentViewport.y - lastViewport.current.y) < threshold
    ) return
    
    lastViewport.current = currentViewport
    
    console.log('🎯 Viewport changed, updating virtualization')
    
    // Always cleanup first for immediate virtualization
    cleanupDistantChunks()
    
    // Then load new chunks if needed
    const visibleCoords = getVisibleChunkCoords()
    void loadChunks(visibleCoords)
  }, [translate, viewportDimensions, getVisibleChunkCoords, loadChunks, cleanupDistantChunks, isInitialized])

  // Throttled viewport updates using RAF
  useEffect(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }
    
    rafId.current = requestAnimationFrame(() => {
      updateVisibleChunks()
    })
    
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [updateVisibleChunks])

  // Get all visible images from loaded chunks (unused for now)
  /*
  const visibleImages = useMemo(() => {
    const images: Array<{ image: ImageItem; position: { x: number; y: number; height: number } }> = []
    
    const viewLeft = -translate.x - VIEWPORT_BUFFER
    const viewRight = -translate.x + viewportDimensions.width + VIEWPORT_BUFFER
    const viewTop = -translate.y - VIEWPORT_BUFFER
    const viewBottom = -translate.y + viewportDimensions.height + VIEWPORT_BUFFER
    
    chunks.forEach((chunk) => {
      // Quick chunk bounds check
      if (
        chunk.bounds.maxX < viewLeft ||
        chunk.bounds.minX > viewRight ||
        chunk.bounds.maxY < viewTop ||
        chunk.bounds.minY > viewBottom
      ) return
      
      // Check individual images within visible chunks
      chunk.images.forEach((image, index) => {
        const position = chunk.positions[index]
        if (!position) return
        
        if (
          position.x + COLUMN_WIDTH >= viewLeft &&
          position.x <= viewRight &&
          position.y + position.height >= viewTop &&
          position.y <= viewBottom
        ) {
          images.push({ image, position })
        }
      })
    })
    
    return images
  }, [chunks, translate, viewportDimensions])
  */

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const newTranslate = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }

      setTranslate(newTranslate)
    },
    [isDragging, dragStart],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    setIsDragging(true)
    setDragStart({ x: touch.clientX - translate.x, y: touch.clientY - translate.y })
  }

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return
      e.preventDefault()

      const touch = e.touches[0]
      if (!touch) return
      const newTranslate = {
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      }

      setTranslate(newTranslate)
    },
    [isDragging, dragStart],
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle artwork click for similarity view
  const handleArtworkClick = useCallback((image: ImageItem, event: React.MouseEvent) => {
    // Prevent click during dragging
    if (isDragging) return
    
    // Stop event propagation to prevent triggering drag
    event.stopPropagation()
    
    console.log('Artwork clicked:', {
      imageId: image.id,
      databaseId: image.databaseId,
      objectId: image.objectId,
      title: image.title,
      artist: image.artist,
      src: image.src
    })
    
    // Use the database ID for similarity search (this is what the backend expects)
    const artworkId = image.databaseId
    
    console.log('Using database ID for similarity search:', artworkId)
    
    if (artworkId) {
      setSelectedArtworkId(artworkId)
      setShowSimilarity(true)
    } else {
      console.error('No database ID found for artwork:', image)
      alert('This artwork is not available for similarity search')
    }
  }, [isDragging])

  // Close similarity view
  const closeSimilarityView = useCallback(() => {
    setShowSimilarity(false)
    setSelectedArtworkId(null)
  }, [])



  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("touchmove", handleTouchMove, { passive: false })
      document.addEventListener("touchend", handleTouchEnd)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])



  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ backgroundColor: '#EDE9E5' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        ref={gridRef}
        className="relative transition-transform duration-75"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px)`,
        }}
      >
        {/* Grid axis lines - centered at origin */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: GRID_ORIGIN_X,
            top: -50000,
            width: 2,
            height: 100000,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            left: -50000,
            top: GRID_ORIGIN_Y,
            width: 100000,
            height: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1
          }}
        />

        {/* Chunk containers with clipping */}
        {Array.from(chunks.values()).map((chunk) => (
          <div key={`container-${chunk.id}`}>
            {/* Chunk boundary outline */}
            <div
              className="absolute pointer-events-none border border-dashed border-neutral-300"
              style={{
                left: GRID_ORIGIN_X + (chunk.x * CHUNK_WIDTH),
                top: GRID_ORIGIN_Y + (chunk.y * CHUNK_HEIGHT),
                width: CHUNK_WIDTH,
                height: CHUNK_HEIGHT,
                zIndex: 0
              }}
            />
            {/* Clipping container for images */}
            <div
              className="absolute overflow-hidden"
              style={{
                left: GRID_ORIGIN_X + (chunk.x * CHUNK_WIDTH),
                top: GRID_ORIGIN_Y + (chunk.y * CHUNK_HEIGHT),
                width: CHUNK_WIDTH,
                height: CHUNK_HEIGHT,
                zIndex: 1
              }}
            >
              {chunk.images.map((image, index) => {
                const position = chunk.positions[index]
                if (!position?.height || position.height <= 0 || !isFinite(position.height)) return null
                
                return (
                  <div
                    key={image.id}
                    className="absolute bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-200 hover:shadow-md transition-shadow duration-200 group cursor-pointer"
                    style={{
                      left: position.x - (GRID_ORIGIN_X + (chunk.x * CHUNK_WIDTH)),
                      top: position.y - (GRID_ORIGIN_Y + (chunk.y * CHUNK_HEIGHT)),
                      width: image.width,
                      height: position.height,
                    }}
                    onClick={(e) => handleArtworkClick(image, e)}
                  >
                    <img
                      src={image.src}
                      alt={image.title ?? `Artwork ${image.id}`}
                      className="w-full h-full object-cover pointer-events-none select-none"
                      draggable={false}
                      loading="lazy"
                      onError={(e) => {
                        // Hide the image if it fails to load
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        // Optionally show a simple error placeholder
                        const parent = target.parentElement
                        if (parent && !parent.querySelector('.error-placeholder')) {
                          const errorDiv = document.createElement('div')
                          errorDiv.className = 'error-placeholder flex items-center justify-center w-full h-full bg-gray-100 text-gray-400 text-sm'
                          errorDiv.textContent = 'Image unavailable'
                          parent.appendChild(errorDiv)
                        }
                      }}
                    />
                    {/* Metadata overlay on hover */}
                    {(image.title ?? image.artist) && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="p-2 text-white text-xs">
                          {image.title && (
                            <div className="font-medium truncate" title={image.title}>
                              {image.title}
                            </div>
                          )}
                          {image.artist && (
                            <div className="text-white/80 truncate" title={image.artist}>
                              {image.artist}
                            </div>
                          )}
                          {image.date && (
                            <div className="text-white/60 text-xs truncate">
                              {image.date}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}



        {loading && (
          <div
            className="fixed top-4 right-4 z-10"
            style={{ transform: `translate(${-translate.x}px, ${-translate.y}px)` }}
          >
            <div className="bg-white rounded-full px-4 py-2 shadow-lg border border-neutral-200">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                Loading chunks... ({chunks.size} loaded)
              </div>
            </div>
          </div>
        )}

        {/* Debug info - virtualization metrics */}
        <div
          className="fixed top-4 left-4 z-10 bg-black/75 text-white px-3 py-2 rounded text-xs font-mono space-y-1"
          style={{ transform: `translate(${-translate.x}px, ${-translate.y}px)` }}
        >
          <div className="text-green-400">🎮 VIRTUALIZED</div>
          <div>Rendered: {chunks.size}/{MAX_RENDERED_CHUNKS}</div>
          <div>Images: {Array.from(chunks.values()).reduce((total, chunk) => total + chunk.positions.length, 0)}</div>
          <div>Data Cache: {chunkDataMap.size}/{MAX_DATA_CACHE}</div>
          <div>Loading: {Array.from(chunkDataMap.values()).filter(data => data.loading).length}</div>
          <div>Viewport: {getStrictlyVisibleChunkCoords().length} chunks</div>
          <div>Pos: ({Math.round(-translate.x)}, {Math.round(-translate.y)})</div>
        </div>
      </div>
    </div>
  )
}