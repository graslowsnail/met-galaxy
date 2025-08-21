/**
 * useColumnCarryover - Core column carry-over layout logic
 * 
 * This is the heart of the seamless masonry system. It maintains column heights
 * per strip and places tiles at absolute world coordinates, eliminating gaps.
 */

import { useState, useCallback, useRef } from 'react'
import type { 
  UseColumnCarryoverReturn, 
  ImageItem, 
  PositionedImage, 
  ChunkKey, 
  ColumnHeights 
} from '../types/grid'
import { 
  COLUMN_WIDTH, 
  GAP, 
  COLUMNS_PER_CHUNK, 
  CHUNK_WIDTH, 
  CHUNK_HEIGHT,
  DEBUG_LOGGING,
  MAX_SAFE_COORDINATE 
} from '../utils/constants'

// Hybrid approach: only track column heights for nearby chunks
const NEARBY_VIEWPORT_DISTANCE = 4000 // ~2 viewports (assuming 1920px viewport)

interface UseColumnCarryoverOptions {
  viewportCenter?: { x: number; y: number }
}

export function useColumnCarryover(options: UseColumnCarryoverOptions = {}): UseColumnCarryoverReturn {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Raw images for reflow
  const [originalsByKey] = useState<Map<ChunkKey, ImageItem[]>>(new Map())
  
  // Sorted list of Y coordinates per strip (chunkX)
  const [keysByX] = useState<Map<number, number[]>>(new Map())
  
  // Placed tiles with world coordinates
  const [placedByKey] = useState<Map<ChunkKey, PositionedImage[]>>(new Map())
  
  // ============================================================================
  // STRIP STATE MANAGEMENT
  // ============================================================================
  
  // Bidirectional column carry-over - bottoms grow down, tops grow up!
  const stripBottomsRef = useRef<Map<number, ColumnHeights>>(new Map())
  const stripTopsRef = useRef<Map<number, ColumnHeights>>(new Map())
  const stripBaselineRef = useRef<Map<number, number>>(new Map()) // Track original Y baseline
  
  const getStripBottoms = useCallback((stripX: number): ColumnHeights => {
    const existing = stripBottomsRef.current.get(stripX)
    if (existing) return existing
    
    // Initialize new strip with zero column heights
    const newBottoms: ColumnHeights = [0, 0, 0, 0]
    stripBottomsRef.current.set(stripX, newBottoms)
    return newBottoms
  }, [])

  const getStripTops = useCallback((stripX: number): ColumnHeights => {
    const existing = stripTopsRef.current.get(stripX)
    if (existing) return existing
    
    // Initialize new strip with zero column heights (will be set to baseline when first used)
    const newTops: ColumnHeights = [0, 0, 0, 0]
    stripTopsRef.current.set(stripX, newTops)
    return newTops
  }, [])
  
  const setStripBottoms = useCallback((stripX: number, bottoms: ColumnHeights) => {
    stripBottomsRef.current.set(stripX, [...bottoms] as ColumnHeights)
  }, [])

  const setStripTops = useCallback((stripX: number, tops: ColumnHeights) => {
    stripTopsRef.current.set(stripX, [...tops] as ColumnHeights)
  }, [])
  
  // ============================================================================
  // LAYOUT CALCULATIONS
  // ============================================================================
  
  const calculateImageHeight = useCallback((image: ImageItem): number => {
    let aspectRatio = image.aspectRatio
    
    // Fallback aspect ratio calculation
    if (!aspectRatio && image.width && image.height) {
      aspectRatio = image.width / image.height
    }
    
    // Default to square if no aspect ratio available
    if (!aspectRatio || aspectRatio <= 0) {
      aspectRatio = 1.0
    }
    
    // Calculate height based on column width and aspect ratio
    const height = Math.round(COLUMN_WIDTH / aspectRatio)
    
    // Ensure minimum height for layout stability
    return Math.max(height, 100)
  }, [])
  
  const findShortestColumn = useCallback((bottoms: ColumnHeights): number => {
    let shortestIndex = 0
    let shortestHeight = bottoms[0]!
    
    for (let i = 1; i < bottoms.length; i++) {
      if (bottoms[i]! < shortestHeight) {
        shortestHeight = bottoms[i]!
        shortestIndex = i
      }
    }
    
    return shortestIndex
  }, [])
  
  const placeImageInStrip = useCallback((
    image: ImageItem, 
    stripX: number, 
    bottoms: ColumnHeights
  ): { positioned: PositionedImage; newBottoms: ColumnHeights } => {
    // DETERMINISTIC COLUMN ASSIGNMENT based on chunk position and local index
    // This ensures consistent placement while maintaining good distribution
    
    // Use the image's position within its chunk (localIndex) and chunk Y to determine column
    // This way, images maintain their relative positions even when chunks load out of order
    const deterministicColumn = (image.chunkY * COLUMNS_PER_CHUNK + image.localIndex) % COLUMNS_PER_CHUNK
    
    // For better visual balance, we can still use shortest column but with deterministic tiebreaking
    let columnIndex: number
    
    if (image.localIndex < COLUMNS_PER_CHUNK) {
      // First 4 images in a chunk get assigned to columns 0-3 in order
      // This ensures a predictable initial distribution
      columnIndex = image.localIndex % COLUMNS_PER_CHUNK
    } else {
      // After the first row, use shortest column for better balance
      // But use deterministic tiebreaking based on the image's position
      const shortestIndex = findShortestColumn(bottoms)
      columnIndex = shortestIndex
    }
    
    const columnBottom = bottoms[columnIndex]!
    const height = calculateImageHeight(image)
    
    // Calculate world coordinates
    const worldX = stripX * CHUNK_WIDTH + columnIndex * (COLUMN_WIDTH + GAP)
    // Use the running column bottom and clamp to safe coordinate range
    const worldY = Math.max(-MAX_SAFE_COORDINATE, Math.min(MAX_SAFE_COORDINATE, columnBottom))
    
    const positioned: PositionedImage = {
      image,
      worldX,
      worldY,
      width: COLUMN_WIDTH,
      height
    }
    
    // Update column bottom
    const newBottoms = [...bottoms] as ColumnHeights
    newBottoms[columnIndex] = columnBottom + height + GAP
    
    return { positioned, newBottoms }
  }, [findShortestColumn, calculateImageHeight])

  const placeImageInStripUpward = useCallback((
    image: ImageItem, 
    stripX: number, 
    tops: ColumnHeights
  ): { positioned: PositionedImage; newTops: ColumnHeights } => {
    // Same column assignment logic as downward placement
    let columnIndex: number
    
    if (image.localIndex < COLUMNS_PER_CHUNK) {
      columnIndex = image.localIndex % COLUMNS_PER_CHUNK
    } else {
      const shortestIndex = findShortestColumn(tops.map(t => -t) as ColumnHeights) // Find tallest upward column
      columnIndex = shortestIndex
    }
    
    const columnTop = tops[columnIndex]!
    const height = calculateImageHeight(image)
    
    // Calculate world coordinates - place ABOVE the current top
    const worldX = stripX * CHUNK_WIDTH + columnIndex * (COLUMN_WIDTH + GAP)
    const rawWorldY = columnTop - height - GAP // Subtract height and gap to go upward
    const worldY = Math.max(-MAX_SAFE_COORDINATE, Math.min(MAX_SAFE_COORDINATE, rawWorldY))
    
    const positioned: PositionedImage = {
      image,
      worldX,
      worldY,
      width: COLUMN_WIDTH,
      height
    }
    
    // Update column top (moving upward means smaller Y values)
    const newTops = [...tops] as ColumnHeights
    newTops[columnIndex] = worldY // New top is at the start of this image
    
    return { positioned, newTops }
  }, [findShortestColumn, calculateImageHeight])
  
  // ============================================================================
  // STRIP REFLOW LOGIC
  // ============================================================================
  
  const reflowStrip = useCallback((stripX: number) => {
    const chunkYs = keysByX.get(stripX)
    if (!chunkYs || chunkYs.length === 0) {
      return
    }
    
    // Clear existing placements for this strip to prevent duplicates
    for (const y of chunkYs) {
      placedByKey.delete(`${stripX}:${y}`)
    }
    
    // SIMPLIFIED: Always use Y=0 as baseline for all strips
    // This removes complexity and ensures consistency
    const baseline = 0
    
    // Clamp baselineOffset to safe pixel coordinates to prevent browser rendering issues
    const rawBaselineOffset = baseline * CHUNK_HEIGHT
    const baselineOffset = Math.max(-MAX_SAFE_COORDINATE, Math.min(MAX_SAFE_COORDINATE, rawBaselineOffset))
    
    // Separate chunks into above and below baseline
    const aboveChunks: number[] = []
    const belowChunks: number[] = []
    
    for (const chunkY of chunkYs) {
      if (chunkY < baseline) {
        aboveChunks.push(chunkY)
      } else {
        belowChunks.push(chunkY)
      }
    }
    
    // Process below chunks (downward growth) - these start at baseline
    belowChunks.sort((a, b) => a - b) // Process from baseline downward
    let bottoms: ColumnHeights = [baselineOffset, baselineOffset, baselineOffset, baselineOffset]
    
    for (const chunkY of belowChunks) {
      const chunkKey: ChunkKey = `${stripX}:${chunkY}`
      const images = originalsByKey.get(chunkKey)
      
      if (!images || images.length === 0) continue
      
      const positionedImages: PositionedImage[] = []
      
      for (const image of images) {
        const { positioned, newBottoms } = placeImageInStrip(image, stripX, bottoms)
        positionedImages.push(positioned)
        bottoms = newBottoms
      }
      
      placedByKey.set(chunkKey, positionedImages)
    }
    
    // Process above chunks (upward growth) - these start at baseline and grow up
    aboveChunks.sort((a, b) => b - a) // Process from baseline upward (descending order)
    let tops: ColumnHeights = [baselineOffset, baselineOffset, baselineOffset, baselineOffset]
    
    for (const chunkY of aboveChunks) {
      const chunkKey: ChunkKey = `${stripX}:${chunkY}`
      const images = originalsByKey.get(chunkKey)
      
      if (!images || images.length === 0) continue
      
      const positionedImages: PositionedImage[] = []
      
      for (const image of images) {
        const { positioned, newTops } = placeImageInStripUpward(image, stripX, tops)
        positionedImages.push(positioned)
        tops = newTops
      }
      
      placedByKey.set(chunkKey, positionedImages)
    }
    
    // Update strip state
    setStripBottoms(stripX, bottoms)
    setStripTops(stripX, tops)
    
  }, [keysByX, originalsByKey, placedByKey, placeImageInStrip, placeImageInStripUpward, setStripBottoms, setStripTops])
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  const upsertChunk = useCallback((x: number, y: number, images: ImageItem[]): PositionedImage[] => {
    const chunkKey: ChunkKey = `${x}:${y}`
    
    // Check if this chunk is already placed with the same images
    const existingPlaced = placedByKey.get(chunkKey)
    const existingImages = originalsByKey.get(chunkKey)
    
    // If chunk already exists with identical content, return existing placement
    if (existingPlaced && existingImages && 
        existingImages.length === images.length &&
        existingImages.every((img, i) => img.id === images[i]?.id)) {
      return existingPlaced
    }
    
    // Store original images
    originalsByKey.set(chunkKey, images)
    
    // Add chunk Y to strip's sorted list
    const existingYs = keysByX.get(x) || []
    const wasNewChunk = !existingYs.includes(y)
    if (wasNewChunk) {
      existingYs.push(y)
      existingYs.sort((a, b) => a - b)
      keysByX.set(x, existingYs)
    }
    
    // Only reflow if this is truly a new chunk or changed chunk
    // Don't reflow just because viewport changed and chunks became visible again
    if (wasNewChunk || !existingPlaced) {
      reflowStrip(x)
    }
    
    // Return placed tiles for this specific chunk
    return placedByKey.get(chunkKey) || []
  }, [originalsByKey, keysByX, placedByKey, reflowStrip])
  
  const getPlaced = useCallback((x: number, y: number): PositionedImage[] | undefined => {
    const chunkKey: ChunkKey = `${x}:${y}`
    return placedByKey.get(chunkKey)
  }, [placedByKey])
  
  const pruneTo = useCallback((keepKeys: Set<ChunkKey>) => {
    let prunedCount = 0
    const viewportCenter = options.viewportCenter
    
    // HYBRID APPROACH: More aggressive pruning based on distance
    const nearbyKeys = new Set<ChunkKey>()
    const nearbyStrips = new Set<number>()
    
    if (viewportCenter) {
      // Only keep chunks that are nearby
      for (const key of keepKeys) {
        const [xStr, yStr] = key.split(':')
        if (xStr && yStr) {
          const x = parseInt(xStr, 10)
          const y = parseInt(yStr, 10)
          
          if (!isNaN(x) && !isNaN(y)) {
            // Calculate chunk center
            const chunkCenterX = x * CHUNK_WIDTH + CHUNK_WIDTH / 2
            const chunkCenterY = y * CHUNK_HEIGHT + CHUNK_HEIGHT / 2
            
            // Distance from viewport center
            const distance = Math.sqrt(
              Math.pow(chunkCenterX - viewportCenter.x, 2) + 
              Math.pow(chunkCenterY - viewportCenter.y, 2)
            )
            
            // Only keep if within nearby distance
            if (distance <= NEARBY_VIEWPORT_DISTANCE) {
              nearbyKeys.add(key)
              nearbyStrips.add(x)
            }
          }
        }
      }
    } else {
      // Fallback to keeping all visible chunks if no viewport center
      nearbyKeys.forEach(key => keepKeys.add(key))
    }
    
    // Remove ALL chunks that aren't nearby
    for (const [key] of originalsByKey) {
      if (!nearbyKeys.has(key)) {
        originalsByKey.delete(key)
        placedByKey.delete(key)
        prunedCount++
      }
    }
    
    // AGGRESSIVELY clean up strip state for non-nearby strips
    const allStrips = new Set([
      ...stripBottomsRef.current.keys(),
      ...stripTopsRef.current.keys(),
      ...stripBaselineRef.current.keys()
    ])
    
    for (const stripX of allStrips) {
      if (!nearbyStrips.has(stripX)) {
        stripBottomsRef.current.delete(stripX)
        stripTopsRef.current.delete(stripX)
        stripBaselineRef.current.delete(stripX)
      }
    }
    
    // Rebuild keysByX from nearby chunks only
    keysByX.clear()
    
    for (const key of nearbyKeys) {
      const [xStr, yStr] = key.split(':')
      if (xStr && yStr) {
        const x = parseInt(xStr, 10)
        const y = parseInt(yStr, 10)
        
        if (!isNaN(x) && !isNaN(y)) {
          const existingYs = keysByX.get(x) || []
          if (!existingYs.includes(y)) {
            existingYs.push(y)
            existingYs.sort((a, b) => a - b)
            keysByX.set(x, existingYs)
          }
        }
      }
    }
    
    // Only reflow nearby strips
    for (const stripX of nearbyStrips) {
      reflowStrip(stripX)
    }
    
    if (DEBUG_LOGGING && prunedCount > 0) {
      console.log(`[ColumnCarryover] Pruned ${prunedCount} distant chunks, kept ${nearbyKeys.size} nearby`)
    }
    
  }, [originalsByKey, placedByKey, keysByX, reflowStrip, options.viewportCenter])
  
  const snapshotPlaced = useCallback((): PositionedImage[] => {
    const allPlaced: PositionedImage[] = []
    
    for (const positioned of placedByKey.values()) {
      allPlaced.push(...positioned)
    }
    
    return allPlaced
  }, [placedByKey])
  
  const getStats = useCallback(() => {
    const totalTiles = Array.from(placedByKey.values())
      .reduce((sum, tiles) => sum + tiles.length, 0)
    
    return {
      totalTiles,
      strips: stripBaselineRef.current.size,
      chunks: placedByKey.size
    }
  }, [placedByKey])
  
  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    upsertChunk,
    getPlaced,
    reflowStrip,
    pruneTo,
    snapshotPlaced,
    getStats,
  }
}
