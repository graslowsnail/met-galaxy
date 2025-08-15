"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { api } from "@/trpc/react"

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
  objectId?: number
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
const VIEWPORT_BUFFER = 800 // Buffer zone around viewport
const MAX_CHUNKS = 25 // Maximum chunks to keep in memory
const HORIZONTAL_TILE_CHUNKS = 2 // Repeat content every N horizontal chunks

// Grid origin - chunks are positioned relative to this center point
const GRID_ORIGIN_X = 0
const GRID_ORIGIN_Y = 0

// Store artwork data for chunks
const artworkCache = new Map<string, any[]>()

// Generate image items from artwork data
const generateChunkImagesFromArtworks = (chunkX: number, chunkY: number, artworks: any[]): ImageItem[] => {
  const defaultAspectRatios = [0.7, 0.8, 1.0, 1.2, 1.4, 0.6, 1.6]
  
  return artworks
    .slice(0, CHUNK_SIZE)
    .filter((artwork) => artwork.primaryImageSmall || artwork.primaryImage) // Only include artworks with images
    .map((artwork, i) => {
      const seed = Math.abs(chunkX * 1000 + chunkY * 100 + i)
      const fallbackAspectRatio = defaultAspectRatios[seed % defaultAspectRatios.length]!
      const aspectRatio = fallbackAspectRatio // We'll calculate from image dimensions later
      const width = COLUMN_WIDTH
      const height = Math.max(100, Math.round(width / aspectRatio))

      // Use primaryImageSmall if available, fallback to primaryImage
      const imageUrl = artwork.primaryImageSmall || artwork.primaryImage
      const src = imageUrl!

      return {
        id: `artwork-${artwork.objectId || seed}-${chunkX}-${chunkY}-${i}`,
        src,
        width,
        height,
        aspectRatio,
        chunkX,
        chunkY,
        localIndex: i,
        // Database fields
        objectId: artwork.objectId,
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

  // Get random artworks for generating content
  const { data: artworkData, isLoading: artworkLoading } = api.artwork.getRandomArtworks.useQuery(
    { count: 200 }, // Get a pool of artworks to use across chunks
    { 
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )

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
    // Get artwork data for this chunk
    let images: ImageItem[] = []
    
    if (artworkData && artworkData.length > 0) {
      // Use deterministic selection from artwork pool
      const seed = Math.abs(chunkX * 1000 + chunkY * 100)
      const startIndex = seed % Math.max(1, artworkData.length - CHUNK_SIZE)
      
      // Get a larger pool to account for filtering
      const poolSize = Math.min(CHUNK_SIZE * 2, artworkData.length)
      const chunkArtworks = artworkData.slice(startIndex, startIndex + poolSize)
      
      // If we don't have enough, wrap around to the beginning
      if (chunkArtworks.length < poolSize) {
        const remainingSlots = poolSize - chunkArtworks.length
        const fillArtworks = artworkData.slice(0, remainingSlots)
        chunkArtworks.push(...fillArtworks)
      }
      
      images = generateChunkImagesFromArtworks(chunkX, chunkY, chunkArtworks)
      
      // If we still don't have enough images after filtering, try to get more
      if (images.length < CHUNK_SIZE) {
        const additionalArtworks = artworkData.slice(0, CHUNK_SIZE - images.length)
        const additionalImages = generateChunkImagesFromArtworks(chunkX, chunkY, additionalArtworks)
        images.push(...additionalImages)
      }
    }
    
    // Only use placeholders if we have absolutely no artwork data
    if (images.length === 0) {
      images = generatePlaceholderImages(chunkX, chunkY)
    }

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

    images.forEach((image, imageIndex) => {
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
  }, [artworkData, initializeChunkColumnHeights])

  // Get visible chunk coordinates for quadrant-based grid
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
    
    return coords
  }, [translate, viewportDimensions])

  // Cleanup distant chunks to prevent memory leaks
  const cleanupDistantChunks = useCallback(() => {
    const visibleCoords = getVisibleChunkCoords()
    const visibleSet = new Set(visibleCoords.map(coord => `${coord.x},${coord.y}`))
    
    setChunks(prevChunks => {
      const newChunks = new Map(prevChunks)
      const chunkKeys = Array.from(newChunks.keys())
      
      // Only keep chunks that are visible or recently visible
      const chunksToRemove = chunkKeys.filter(key => !visibleSet.has(key))
      
      if (newChunks.size - chunksToRemove.length > MAX_CHUNKS) {
        // Remove oldest chunks first
        chunksToRemove.slice(0, chunksToRemove.length - (MAX_CHUNKS - visibleSet.size))
          .forEach(key => newChunks.delete(key))
      }
      
      return newChunks
    })
  }, [getVisibleChunkCoords])

  // Load chunks efficiently with async batching
  const loadChunks = useCallback(async (coords: Array<{ x: number; y: number }>) => {
    const newChunks: Array<Chunk> = []
    
    for (const coord of coords) {
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
      }
    }
    
    if (newChunks.length > 0) {
      setLoading(true)
      
      // Simulate async loading with batch processing
      await new Promise(resolve => setTimeout(resolve, 50))
      
      setChunks(prev => {
        const updated = new Map(prev)
        newChunks.forEach(chunk => {
          updated.set(`${chunk.x},${chunk.y}`, chunk)
          loadingChunks.current.delete(`${chunk.x},${chunk.y}`)
        })
        return updated
      })
      
      setLoading(false)
    } else {
      // Clean up loading state for failed chunks
      coords.forEach(coord => {
        const chunkKey = `${coord.x},${coord.y}`
        loadingChunks.current.delete(chunkKey)
      })
    }
  }, [chunks, createChunk])

  // Initialize with 4 chunks centered around origin (only once)
  useEffect(() => {
    // Only run once when viewport dimensions are first available
    if (viewportDimensions.width && viewportDimensions.height && translate.x === 0 && translate.y === 0) {
      // Calculate center position
      const centerX = viewportDimensions.width / 2
      const centerY = viewportDimensions.height / 2
      
      // Set initial translate to center (0,0) chunk in viewport - ONLY ONCE
      setTranslate({ x: centerX, y: centerY })
      
      // Load the 4 chunks around origin
      loadChunks([
        { x: -1, y: -1 }, // top-left
        { x: 0, y: -1 },  // top-right  
        { x: -1, y: 0 },  // bottom-left
        { x: 0, y: 0 }    // bottom-right
      ])
    }
  }, [viewportDimensions, translate.x, translate.y, loadChunks])

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
    if (!viewportDimensions.width || !viewportDimensions.height) return
    
    const currentViewport = {
      x: -translate.x,
      y: -translate.y,
      width: viewportDimensions.width,
      height: viewportDimensions.height
    }
    
    // Only update if viewport changed significantly
    const threshold = 100
    if (
      Math.abs(currentViewport.x - lastViewport.current.x) < threshold &&
      Math.abs(currentViewport.y - lastViewport.current.y) < threshold
    ) return
    
    lastViewport.current = currentViewport
    
    const visibleCoords = getVisibleChunkCoords()
    loadChunks(visibleCoords)
    
    // Cleanup after loading
    cleanupDistantChunks()
  }, [translate, viewportDimensions, getVisibleChunkCoords, loadChunks, cleanupDistantChunks])

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

  // Get all visible images from loaded chunks
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
      className="w-full h-screen overflow-hidden bg-neutral-50 cursor-grab active:cursor-grabbing"
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
                if (!position || !position.height || position.height <= 0 || !isFinite(position.height)) return null
                
                return (
                  <div
                    key={image.id}
                    className="absolute bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-200 hover:shadow-md transition-shadow duration-200 group"
                    style={{
                      left: position.x - (GRID_ORIGIN_X + (chunk.x * CHUNK_WIDTH)),
                      top: position.y - (GRID_ORIGIN_Y + (chunk.y * CHUNK_HEIGHT)),
                      width: image.width,
                      height: position.height,
                    }}
                  >
                    <img
                      src={image.src}
                      alt={image.title || `Artwork ${image.id}`}
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
                    {(image.title || image.artist) && (
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



        {(loading || artworkLoading) && (
          <div
            className="fixed top-4 right-4 z-10"
            style={{ transform: `translate(${-translate.x}px, ${-translate.y}px)` }}
          >
            <div className="bg-white rounded-full px-4 py-2 shadow-lg border border-neutral-200">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                {artworkLoading ? 'Loading artworks...' : `Loading chunks... (${chunks.size} loaded)`}
              </div>
            </div>
          </div>
        )}

        {/* Debug info - remove in production */}
        <div
          className="fixed top-4 left-4 z-10 bg-black/75 text-white px-3 py-2 rounded text-xs font-mono space-y-1"
          style={{ transform: `translate(${-translate.x}px, ${-translate.y}px)` }}
        >
          <div>Chunks: {chunks.size}</div>
          <div>Images: {Array.from(chunks.values()).reduce((total, chunk) => total + chunk.positions.length, 0)}</div>
          <div>Artworks: {artworkData?.length || 0}</div>
          <div>Pos: ({Math.round(-translate.x)}, {Math.round(-translate.y)})</div>
          <div>Grid: ({Math.floor((-translate.x - GRID_ORIGIN_X) / CHUNK_WIDTH)}, {Math.floor((-translate.y - GRID_ORIGIN_Y) / CHUNK_HEIGHT)})</div>
        </div>
      </div>
    </div>
  )
}