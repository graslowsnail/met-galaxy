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
  DEBUG_LOGGING 
} from '../utils/constants'

export function useColumnCarryover(): UseColumnCarryoverReturn {
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
  
  // Column bottoms per strip - this is where the magic happens!
  const stripBottomsRef = useRef<Map<number, ColumnHeights>>(new Map())
  
  const getStripBottoms = useCallback((stripX: number): ColumnHeights => {
    const existing = stripBottomsRef.current.get(stripX)
    if (existing) return existing
    
    // Initialize new strip with zero column heights
    const newBottoms: ColumnHeights = [0, 0, 0, 0]
    stripBottomsRef.current.set(stripX, newBottoms)
    return newBottoms
  }, [])
  
  const setStripBottoms = useCallback((stripX: number, bottoms: ColumnHeights) => {
    stripBottomsRef.current.set(stripX, [...bottoms] as ColumnHeights)
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
    // Use the running column bottom - this will be offset correctly by reflowStrip
    const worldY = columnBottom
    
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
  
  // ============================================================================
  // STRIP REFLOW LOGIC
  // ============================================================================
  
  const reflowStrip = useCallback((stripX: number) => {
    const chunkYs = keysByX.get(stripX)
    if (!chunkYs || chunkYs.length === 0) {
      if (DEBUG_LOGGING) {
        console.log(`🔄 Strip ${stripX}: No chunks to reflow`)
      }
      return
    }
    
    if (DEBUG_LOGGING) {
      console.log(`🔄 Reflowing strip ${stripX} with chunks:`, chunkYs)
    }
    
    // Process chunks in ascending Y order
    const sortedYs = [...chunkYs].sort((a, b) => a - b)
    
    // FIX: Use stable strip baseline - don't recalculate from new first chunk
    // This prevents existing chunks from moving when new chunks are added above them
    const existingBottoms = stripBottomsRef.current.get(stripX)
    let bottoms: ColumnHeights
    
    if (existingBottoms && existingBottoms.some(h => h !== 0)) {
      // Strip has existing content - preserve the established baseline
      bottoms = [...existingBottoms] as ColumnHeights
    } else {
      // New strip - establish initial baseline from first chunk
      const firstChunkY = sortedYs[0] ?? 0
      const initialOffset = firstChunkY * CHUNK_HEIGHT
      bottoms = [initialOffset, initialOffset, initialOffset, initialOffset]
    }
    
    
    // Process chunks - handle existing chunks vs new chunks differently
    for (const chunkY of sortedYs) {
      const chunkKey: ChunkKey = `${stripX}:${chunkY}`
      const images = originalsByKey.get(chunkKey)
      
      if (!images || images.length === 0) {
        continue
      }
      
      // Check if chunk already positioned
      const existingPlaced = placedByKey.get(chunkKey)
      if (existingPlaced && existingPlaced.length === images.length) {
        // Skip existing chunks to avoid repositioning
        continue
      }
      
      // This is a new chunk - place it appropriately
      let chunkBottoms: ColumnHeights
      const chunkStartY = chunkY * CHUNK_HEIGHT
      
      if (existingBottoms && chunkStartY < Math.min(...existingBottoms)) {
        // New chunk is ABOVE existing content - place at chunk boundary
        chunkBottoms = [chunkStartY, chunkStartY, chunkStartY, chunkStartY]
      } else {
        // New chunk is BELOW existing content - continue from current bottoms  
        chunkBottoms = bottoms.map(bottom => Math.max(bottom, chunkStartY)) as ColumnHeights
      }
      
      // Place all images in this chunk
      const positionedImages: PositionedImage[] = []
      
      for (const image of images) {
        const { positioned, newBottoms } = placeImageInStrip(image, stripX, chunkBottoms)
        positionedImages.push(positioned)
        chunkBottoms = newBottoms
      }
      
      // Store placed tiles for this chunk
      placedByKey.set(chunkKey, positionedImages)
      
      // Update bottoms appropriately
      if (chunkStartY < Math.min(...bottoms)) {
        // Chunk was above - don't update bottoms (it doesn't extend downward)
      } else {
        // Chunk was below - update bottoms
        bottoms = chunkBottoms
      }
    }
    
    // Update strip bottoms
    setStripBottoms(stripX, bottoms)
    
    // if (DEBUG_LOGGING) {
    //   console.log(`🏁 Strip ${stripX} reflow complete. Column bottoms:`, bottoms)
    // }
  }, [keysByX, originalsByKey, placedByKey, placeImageInStrip, setStripBottoms])
  
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
    
    // Remove non-visible chunks from all maps
    for (const [key] of originalsByKey) {
      if (!keepKeys.has(key)) {
        originalsByKey.delete(key)
        placedByKey.delete(key)
        prunedCount++
      }
    }
    
    // Rebuild keysByX from remaining chunks
    keysByX.clear()
    
    for (const key of keepKeys) {
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
    
    // Reflow affected strips
    const affectedStrips = new Set<number>()
    for (const key of keepKeys) {
      const [xStr] = key.split(':')
      if (xStr) {
        const x = parseInt(xStr, 10)
        if (!isNaN(x)) {
          affectedStrips.add(x)
        }
      }
    }
    
    for (const stripX of affectedStrips) {
      reflowStrip(stripX)
    }
    
    // if (DEBUG_LOGGING && prunedCount > 0) {
    //   // console.log(`🧹 Pruned ${prunedCount} chunks, keeping ${keepKeys.size}`)
    // }
  }, [originalsByKey, placedByKey, keysByX, reflowStrip])
  
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
      strips: stripBottomsRef.current.size,
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
