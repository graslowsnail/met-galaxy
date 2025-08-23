/**
 * Simple Hook for managing similarity chunk data
 * 
 * This is a simplified version based on the draggable grid's useChunkData hook.
 * It uses the field-chunk API for all chunks except the focal chunk (0,0).
 * The architecture is much simpler - no similarity zones, no ring logic, just
 * straightforward chunk-based data fetching like the working draggable grid.
 */

import { useState, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import type { Artwork, FieldChunkItem } from '@/types/api'
import type { 
  ChunkData, 
  ChunkCoordinates, 
  UseChunkDataReturn 
} from '../../../grid-legacy/grid/types/grid'
import { getChunkKey } from '../../../grid-legacy/grid/utils/chunkCalculations'
import { MAX_DATA_CACHE, CHUNK_SIZE, DEBUG_LOGGING } from '../../../grid-legacy/grid/utils/constants'

interface UseSimilarityChunkDataProps {
  focalArtworkId: number
  focalArtwork?: {
    id: number
    title: string | null
    artist: string | null
    imageUrl: string | null
    originalImageUrl: string | null
  }
}

/**
 * Custom hook for managing similarity chunk data with field-chunk API
 * 
 * Features:
 * - Uses field-chunk API for all chunks except focal (0,0) 
 * - Focal chunk (0,0) displays the user's selected image
 * - Simple chunk IDs like draggable grid
 * - Same caching and deduplication as draggable grid
 */
export function useSimilarityChunkDataSimple({
  focalArtworkId,
  focalArtwork
}: UseSimilarityChunkDataProps): UseChunkDataReturn {
  // ============================================================================
  // STATE MANAGEMENT - Same as draggable grid + deduplication tracking
  // ============================================================================
  
  /** Map of chunk keys to their data state */
  const [chunkDataMap, setChunkDataMap] = useState<Map<string, ChunkData>>(new Map())
  
  /** Track which chunks are currently being fetched to prevent duplicates */
  const fetchingChunks = useRef<Set<string>>(new Set())
  
  /** Track overall loading state */
  const [isLoading, setIsLoading] = useState(false)
  
  /** Global set of artwork IDs that have already been fetched to prevent duplicates across chunks */
  const usedArtworkIds = useRef<Set<number>>(new Set())
  
  /** Track when focal artwork ID changes to reset deduplication */
  const lastFocalId = useRef<number>(focalArtworkId)
  
  // ============================================================================
  // CACHE MANAGEMENT - Same as draggable grid
  // ============================================================================
  
  /**
   * Clean up data cache using LRU (Least Recently Used) strategy
   */
  const cleanupDataCache = useCallback(() => {
    setChunkDataMap(prevData => {
      if (prevData.size <= MAX_DATA_CACHE) return prevData
      
      const newData = new Map(prevData)
      const dataKeys = Array.from(newData.keys())
      const excessCount = newData.size - MAX_DATA_CACHE
      
      // Remove oldest entries (LRU - Map maintains insertion order)
      const keysToRemove = dataKeys.slice(0, excessCount)
      keysToRemove.forEach(key => newData.delete(key))
      
      if (DEBUG_LOGGING) {
        console.log(`💾 Similarity data cache cleanup: removed ${keysToRemove.length} entries, keeping ${newData.size}`)
      }
      
      return newData
    })
  }, [])
  
  /**
   * Clear the entire data cache and reset deduplication
   */
  const clearCache = useCallback(() => {
    setChunkDataMap(new Map())
    fetchingChunks.current.clear()
    usedArtworkIds.current.clear()
    lastFocalId.current = focalArtworkId
    
    if (DEBUG_LOGGING) {
      console.log('🧹 Similarity data cache cleared completely and deduplication reset')
    }
  }, [focalArtworkId])
  
  // ============================================================================
  // DATA FETCHING - Modified for similarity grid
  // ============================================================================
  
  /**
   * Fetch artwork data for a specific chunk
   * - Focal chunk (0,0): Returns the focal artwork
   * - All other chunks: Uses field-chunk API
   * 
   * @param chunkX - X coordinate of the chunk
   * @param chunkY - Y coordinate of the chunk
   * @returns Promise resolving to artwork array or null if failed
   */
  const fetchChunkData = useCallback(async (chunkX: number, chunkY: number): Promise<Artwork[] | null> => {
    const chunkKey = getChunkKey(chunkX, chunkY)
    
    // Reset deduplication if focal artwork changed
    if (lastFocalId.current !== focalArtworkId) {
      if (DEBUG_LOGGING) {
        console.log(`🔄 Focal artwork changed from ${lastFocalId.current} to ${focalArtworkId}, clearing deduplication`)
      }
      usedArtworkIds.current.clear()
      lastFocalId.current = focalArtworkId
    }
    
    // Skip if already loaded or loading
    const existingData = chunkDataMap.get(chunkKey)
    if (existingData && (existingData.loading || existingData.artworks)) {
      if (DEBUG_LOGGING) {
        console.log(`Similarity chunk ${chunkKey} already has data, skipping fetch`)
      }
      return existingData.artworks
    }
    
    // Skip if already being fetched (deduplication)
    if (fetchingChunks.current.has(chunkKey)) {
      if (DEBUG_LOGGING) {
        console.log(`Similarity chunk ${chunkKey} already being fetched, skipping duplicate`)
      }
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
    
    // Update global loading state
    setIsLoading(true)
    
    try {
      let artworks: Artwork[] = []
      
      // Handle focal chunk (0,0) - display the focal image
      if (chunkX === 0 && chunkY === 0) {
        if (DEBUG_LOGGING) {
          console.log(`🎯 Creating focal chunk ${chunkKey} with focal artwork ${focalArtworkId}`)
        }
        
        if (focalArtwork) {
          // Transform focal artwork to match Artwork interface
          artworks = [{
            id: focalArtwork.id,
            objectId: focalArtwork.id, // Use same ID for objectId
            title: focalArtwork.title,
            artist: focalArtwork.artist,
            date: null,
            imageUrl: focalArtwork.imageUrl,
            originalImageUrl: focalArtwork.originalImageUrl || focalArtwork.imageUrl,
            imageSource: 's3',
            department: null,
            culture: null,
            medium: null,
            primaryImage: focalArtwork.imageUrl,
            primaryImageSmall: focalArtwork.imageUrl
          }]
        } else {
          if (DEBUG_LOGGING) {
            console.log(`⚠️ No focal artwork provided for focal chunk`)
          }
          artworks = []
        }
        
        // Add focal artwork ID to used set to prevent it appearing in other chunks
        if (focalArtwork) {
          usedArtworkIds.current.add(focalArtwork.id)
        }
      } 
      // Handle all other chunks - use field-chunk API with deduplication
      else {
        if (DEBUG_LOGGING) {
          console.log(`🌍 Fetching field-chunk data for chunk ${chunkX},${chunkY} with target ${focalArtworkId}, excluding ${usedArtworkIds.current.size} already used artworks`)
        }
        
        // Get list of already used artwork IDs to exclude
        const excludeIds = Array.from(usedArtworkIds.current)
        
        const response = await apiClient.fetchFieldChunk({
          targetId: focalArtworkId,
          chunkX,
          chunkY,
          count: CHUNK_SIZE,
          excludeIds: excludeIds // Use the exclude parameter to prevent duplicates!
        })
        
        // Transform FieldChunkItem to Artwork format
        artworks = response.data.map((item: FieldChunkItem) => ({
          id: item.id,
          objectId: item.objectId,
          title: item.title,
          artist: item.artist,
          date: null,
          imageUrl: item.imageUrl,
          originalImageUrl: item.originalImageUrl || item.imageUrl,
          imageSource: item.imageSource,
          department: null,
          culture: null,
          medium: null,
          primaryImage: item.imageUrl,
          primaryImageSmall: item.imageUrl
        }))
        
        // Add all fetched artwork IDs to the used set to prevent future duplicates
        artworks.forEach(artwork => {
          usedArtworkIds.current.add(artwork.id)
        })
        
        if (DEBUG_LOGGING) {
          console.log(`✅ Loaded ${artworks.length} artworks for similarity chunk ${chunkX},${chunkY} (t=${response.meta.t.toFixed(3)}, weights: sim=${response.meta.weights.sim.toFixed(2)}, drift=${response.meta.weights.drift.toFixed(2)}, rand=${response.meta.weights.rand.toFixed(2)})`)
          console.log(`📊 Total unique artworks used: ${usedArtworkIds.current.size}`)
        }
      }
      
      // Update with successful data
      setChunkDataMap(prev => new Map(prev).set(chunkKey, {
        artworks: artworks,
        loading: false,
        error: null
      }))
      
      // Trigger cache cleanup if needed
      cleanupDataCache()
      
      return artworks
      
    } catch (error) {
      console.error(`❌ Error fetching similarity chunk ${chunkX},${chunkY}:`, error)
      
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
      
      // Update global loading state
      setIsLoading(prev => {
        // Check if any other chunks are still loading
        const stillLoading = Array.from(chunkDataMap.values()).some(data => data.loading)
        return stillLoading
      })
    }
  }, [chunkDataMap, focalArtworkId, focalArtwork, cleanupDataCache])
  
  // ============================================================================
  // BATCH OPERATIONS - Same as draggable grid
  // ============================================================================
  
  /**
   * Fetch multiple chunks in parallel with intelligent batching
   */
  const fetchMultipleChunks = useCallback(async (coordinates: ChunkCoordinates[]): Promise<void> => {
    if (coordinates.length === 0) return
    
    if (DEBUG_LOGGING) {
      console.log(`📦 Fetching ${coordinates.length} similarity chunks in parallel:`, 
        coordinates.map(c => `(${c.x},${c.y})`).join(', '))
    }
    
    // Filter out chunks that don't need fetching
    const chunksToFetch = coordinates.filter(coord => {
      const chunkKey = getChunkKey(coord.x, coord.y)
      const existingData = chunkDataMap.get(chunkKey)
      const alreadyFetching = fetchingChunks.current.has(chunkKey)
      
      return !existingData && !alreadyFetching
    })
    
    if (chunksToFetch.length === 0) {
      if (DEBUG_LOGGING) {
        console.log('No similarity chunks need fetching - all already loaded or loading')
      }
      return
    }
    
    // Fetch all chunks in parallel
    await Promise.allSettled(
      chunksToFetch.map(coord => fetchChunkData(coord.x, coord.y))
    )
    
    if (DEBUG_LOGGING) {
      console.log(`✅ Batch fetch complete for ${chunksToFetch.length} similarity chunks`)
    }
  }, [chunkDataMap, fetchChunkData])
  
  // ============================================================================
  // UTILITY FUNCTIONS - Same as draggable grid
  // ============================================================================
  
  /**
   * Get data for a specific chunk (synchronous access to cache)
   */
  const getChunkData = useCallback((chunkX: number, chunkY: number): ChunkData | undefined => {
    const chunkKey = getChunkKey(chunkX, chunkY)
    return chunkDataMap.get(chunkKey)
  }, [chunkDataMap])
  
  /**
   * Check if a chunk has loaded artwork data
   */
  const hasChunkData = useCallback((chunkX: number, chunkY: number): boolean => {
    const data = getChunkData(chunkX, chunkY)
    return Boolean(data?.artworks && data.artworks.length > 0)
  }, [getChunkData])
  
  /**
   * Check if a chunk is currently loading
   */
  const isChunkLoading = useCallback((chunkX: number, chunkY: number): boolean => {
    const data = getChunkData(chunkX, chunkY)
    return Boolean(data?.loading)
  }, [getChunkData])
  
  /**
   * Get cache statistics for monitoring and debugging
   */
  const getCacheStats = useCallback(() => {
    const stats = {
      totalEntries: chunkDataMap.size,
      loadedEntries: 0,
      loadingEntries: 0,
      errorEntries: 0,
      fetchingEntries: fetchingChunks.current.size,
    }
    
    for (const data of chunkDataMap.values()) {
      if (data.artworks) stats.loadedEntries++
      if (data.loading) stats.loadingEntries++
      if (data.error) stats.errorEntries++
    }
    
    return stats
  }, [chunkDataMap])
  
  // ============================================================================
  // RETURN INTERFACE - Same as draggable grid
  // ============================================================================
  
  return {
    // Core data access
    chunkDataMap,
    fetchChunkData,
    isLoading,
    
    // Cache management
    clearCache,
    
    // Batch operations
    fetchMultipleChunks,
    
    // Utility functions
    getChunkData,
    hasChunkData,
    isChunkLoading,
    getCacheStats,
  }
}