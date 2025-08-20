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
    const columnIndex = findShortestColumn(bottoms)
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
    
    // Start column bottoms at the correct Y offset for the first chunk
    const firstChunkY = sortedYs[0] ?? 0
    const initialOffset = firstChunkY * CHUNK_HEIGHT
    let bottoms: ColumnHeights = [initialOffset, initialOffset, initialOffset, initialOffset]
    
    if (DEBUG_LOGGING) {
      console.log(`🔄 Strip ${stripX}: Starting with Y offset ${initialOffset} (firstChunkY: ${firstChunkY})`)
    }
    
    for (const chunkY of sortedYs) {
      const chunkKey: ChunkKey = `${stripX}:${chunkY}`
      const images = originalsByKey.get(chunkKey)
      
      if (!images || images.length === 0) {
        if (DEBUG_LOGGING) {
          console.log(`⚠️ Strip ${stripX}: No images for chunk Y=${chunkY}`)
        }
        continue
      }
      
      // Place all images in this chunk
      const positionedImages: PositionedImage[] = []
      
      for (const image of images) {
        const { positioned, newBottoms } = placeImageInStrip(image, stripX, bottoms)
        positionedImages.push(positioned)
        bottoms = newBottoms
      }
      
      // Store placed tiles for this chunk
      placedByKey.set(chunkKey, positionedImages)
      
      if (DEBUG_LOGGING) {
        console.log(`✅ Strip ${stripX}, Chunk Y=${chunkY}: Placed ${positionedImages.length} images`)
      }
    }
    
    // Update strip bottoms
    setStripBottoms(stripX, bottoms)
    
    if (DEBUG_LOGGING) {
      console.log(`🏁 Strip ${stripX} reflow complete. Column bottoms:`, bottoms)
    }
  }, [keysByX, originalsByKey, placedByKey, placeImageInStrip, setStripBottoms])
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  const upsertChunk = useCallback((x: number, y: number, images: ImageItem[]): PositionedImage[] => {
    const chunkKey: ChunkKey = `${x}:${y}`
    
    if (DEBUG_LOGGING) {
      console.log(`📦 Upserting chunk ${chunkKey} with ${images.length} images`)
    }
    
    // Store original images
    originalsByKey.set(chunkKey, images)
    
    // Add chunk Y to strip's sorted list
    const existingYs = keysByX.get(x) || []
    if (!existingYs.includes(y)) {
      existingYs.push(y)
      existingYs.sort((a, b) => a - b)
      keysByX.set(x, existingYs)
    }
    
    // Reflow the entire strip to maintain consistency
    reflowStrip(x)
    
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
    
    if (DEBUG_LOGGING && prunedCount > 0) {
      console.log(`🧹 Pruned ${prunedCount} chunks, keeping ${keepKeys.size}`)
    }
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
